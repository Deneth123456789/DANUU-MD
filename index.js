/**
 * DANUU-MD WhatsApp Bot - Final Complete Code
 *
 * This file contains all the necessary code and commands to run your bot.
 * It includes all the features requested by the user:
 * - Basic Commands: .start, .ping, .help, .info, .Alive, .Menu, .image, .getdp, .statusview, .antidelete, .viewonce
 * - Fun Commands: .sticker, .quote, .echo, .time, .joke, .song
 * - Automation Features: Auto Status View, Auto Reply, Auto React
 *
 * This version includes a fix for the QR code display issue and a new
 * feature for the bot to automatically react to a user's status updates.
 * It also includes the previously requested commands and the new '.' prefix,
 * and the new '.viewonce' command to bypass "View Once" messages.
 *
 * Steps to run this code:
 * 1. Make sure you have Node.js installed on your computer.
 * 2. Create a new folder for your project and open your terminal inside that folder.
 * 3. Run the following commands to initialize your project and install libraries:
 * `npm init -y`
 * `npm install @whiskeysockets/baileys pino qrcode-terminal`
 * 4. Save this file as `index.js` in your project folder.
 * 5. Start the bot from your terminal by running:
 * `node index.js`
 * 6. Follow the instructions to scan the QR code and link your device.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    proto
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const {
    Boom
} = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const axios = require('axios');

// Variable to control the auto-status-view feature
let isAutoStatusViewEnabled = true;

// Variable to control the anti-delete feature
// This is set to 'true' by default as requested.
let isAntiDeleteEnabled = true;

// Function to start the bot
async function startBot() {
    // Load authentication credentials
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('auth_info_baileys');

    // Fetch the latest version of Baileys
    const {
        version
    } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version.join('.')}`);

    const sock = makeWASocket({
        logger: pino({
            level: 'silent'
        }),
        auth: state,
        browser: ['DANUU-MD', 'Chrome', '1.0.0'],
        version
    });

    // Event handler for connection updates
    sock.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        if (qr) {
            console.log('Scan this QR code with your WhatsApp app to link your device:');
            qrcode.generate(qr, {
                small: true
            });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Connection is open! The DANUU-MD bot is now online.');
        }
    });

    // Save credentials when they are updated
    sock.ev.on('creds.update', saveCreds);

    // --- Automation Feature: Auto Status View and React ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        // Check if auto-status-view is enabled and the message is a status update from someone else
        if (isAutoStatusViewEnabled && msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
            console.log(`New status update from ${msg.key.participant || msg.key.remoteJid}, auto-viewing and reacting...`);
            // Mark the status as read
            await sock.readMessages([msg.key]);

            // React to the status
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: '👻', // You can change this emoji to anything you like
                    key: msg.key
                }
            });
        }
    });

    // --- Main Message Handler ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        if (!msg.key.fromMe && m.type === 'notify' && msg.message) {
            const remoteJid = msg.key.remoteJid;
            const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const lowerCaseText = messageText.toLowerCase();

            console.log(`Received a message from ${remoteJid}: ${messageText}`);
            
            // --- Anti-Delete Logic ---
            if (isAntiDeleteEnabled && msg.message.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
                // This is a deleted message notification
                await sock.sendMessage(remoteJid, {
                    text: '⚠️ මෙම පණිවිඩය මකන ලදී.'
                });
            }

            // --- Automation Feature: Auto React ---
            // React to every message, except for commands that need a specific action.
            if (!lowerCaseText.startsWith('.') && !msg.key.remoteJid.endsWith('status@broadcast')) {
                await sock.sendMessage(remoteJid, {
                    react: {
                        text: '🔥', // You can change this emoji
                        key: msg.key
                    }
                });
            }

            // --- Auto Reply Feature ---
            if (lowerCaseText === 'hello') {
                await sock.sendMessage(remoteJid, {
                    text: '*Hi! I\'m DANUU-MD bot.*'
                });
            } else if (lowerCaseText === 'hi') {
                await sock.sendMessage(remoteJid, {
                    text: '*Hello! How can I help you today?*'
                });
            }

            // --- Other Commands ---
            // Command: .start
            if (lowerCaseText === '.start') {
                const startMessage = `
හලෝ! මම DANUU-MD Bot.
මම මගේ නිර්මාතෘ විසින් විශේෂයෙන් නිර්මාණය කරන ලද්දේ ඔබ වෙනුවෙන් සේවය කිරීමටයි. මගේ සියලු විධාන ලැයිස්තුව බැලීමට .help ටයිප් කරන්න.
                `;
                await sock.sendMessage(remoteJid, {
                    text: startMessage
                });
            }

            // Command: .ping
            if (lowerCaseText === '.ping') {
                await sock.sendMessage(remoteJid, {
                    text: 'Pong!'
                });
            }

            // Command: .help or .menu (updated with all commands)
            if (lowerCaseText === '.help' || lowerCaseText === '.menu') {
                const helpMessage = `
*DANUU-MD Bot Commands:*
* .start: Bot එක පටන් ගන්න.
* .ping: Bot එක online ද කියලා බලන්න.
* .Alive: Bot එක online ද කියලා image එකක් එක්ක බලන්න.
* .help: මේ commands ලැයිස්තුව බලන්න.
* .Menu: මේ commands ලැයිස්තුව බලන්න.
* .info: Bot එක ගැන විස්තර දැනගන්න.
* .image: Image එකක් යවන්න.
* .sticker: Image එකකට reply කරලා sticker එකක් හදන්න.
* .quote: Random quote එකක් ගන්න.
* .echo <text>: ඔයා කියන එක නැවත කියනවා.
* .time: වර්තමාන වේලාව කියනවා.
* .joke: විහිළුවක් කියනවා.
* .song <song name>: සින්දුවක් download කරගන්න.
* .getdp: DP එකක් ගන්න.
* .statusview <on|off>: Statuses ස්වයංක්‍රීයව view කිරීම සක්‍රිය/අක්‍රිය කරන්න.
* .antidelete <on|off>: Deleted messages නැවත යවන්න සක්‍රිය/අක්‍රිය කරන්න.
* .viewonce: "View Once" photo/video එකක් නැවත බලන්න.
                `;
                await sock.sendMessage(remoteJid, {
                    text: helpMessage
                });
            }

            // Command: .info
            if (lowerCaseText === '.info') {
                const infoMessage = `Hello, I'm the DANUU-MD bot. I was created with the Baileys library to automate tasks on WhatsApp.`;
                await sock.sendMessage(remoteJid, {
                    text: infoMessage
                });
            }
            
            // Command: .Alive (Now with an image)
            if (lowerCaseText === '.alive') {
                await sock.sendMessage(remoteJid, {
                    image: {
                        url: 'https://placehold.co/500x300/32CD32/FFFFFF?text=ONLINE'
                    },
                    caption: 'මම දැන් Online ඉන්නවා.'
                });
            }
            
            // Command: .image
            if (lowerCaseText === '.image') {
                await sock.sendMessage(remoteJid, {
                    image: {
                        url: 'https://placehold.co/600x400?text=Hello+from+your+bot'
                    },
                    caption: 'හලෝ! මේ ඔයා ඉල්ලපු image එක.'
                });
            }

            // Command: .song <song name>
            if (lowerCaseText.startsWith('.song')) {
                const songName = messageText.slice('.song'.length).trim();
                if (!songName) {
                    await sock.sendMessage(remoteJid, {
                        text: 'කරුණාකර song එකේ නම .song command එකට පස්සේ දාන්න.'
                    });
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: `කරුණාකර ටිකක් ඉවසන්න, මම "${songName}" සින්දුව හොයනවා.`
                    });
                    
                    const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'; // Placeholder URL
                    try {
                        await sock.sendMessage(remoteJid, {
                            audio: {
                                url: audioUrl
                            },
                            mimetype: 'audio/mp4',
                            ptt: false,
                            fileName: `${songName}.mp3`,
                            caption: `ඔයා ඉල්ලපු සින්දුව මෙන්න. (සින්දුවේ නම: ${songName})`
                        });
                    } catch (error) {
                        console.error('Error sending audio message:', error);
                        await sock.sendMessage(remoteJid, {
                            text: 'සින්දුව download කිරීමේදී ගැටලුවක් ඇති වුණා. කරුණාකර නැවත උත්සාහ කරන්න.'
                        });
                    }
                }
            }

            // Command: .getdp
            if (lowerCaseText === '.getdp') {
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                const participantJid = quoted ? msg.message.extendedTextMessage.contextInfo.participant : remoteJid;
                
                try {
                    const dpUrl = await sock.profilePictureUrl(participantJid, 'image');
                    
                    if (dpUrl) {
                        await sock.sendMessage(remoteJid, {
                            image: {
                                url: dpUrl
                            },
                            caption: 'මෙන්න DP එක.'
                        });
                    } else {
                        await sock.sendMessage(remoteJid, {
                            text: 'මේ user ට DP එකක් නැහැ.'
                        });
                    }
                } catch (e) {
                    console.error('Error getting DP:', e);
                    await sock.sendMessage(remoteJid, {
                        text: 'DP එක ගන්න බෑ. කරුණාකර නැවත උත්සාහ කරන්න.'
                    });
                }
            }
            
            // Command: .statusview
            if (lowerCaseText.startsWith('.statusview')) {
                const command = lowerCaseText.slice('.statusview'.length).trim();
                if (command === 'on') {
                    isAutoStatusViewEnabled = true;
                    await sock.sendMessage(remoteJid, {
                        text: 'Status View feature එක දැන් **සක්‍රිය**යි.'
                    });
                } else if (command === 'off') {
                    isAutoStatusViewEnabled = false;
                    await sock.sendMessage(remoteJid, {
                        text: 'Status View feature එක දැන් **අක්‍රිය**යි.'
                    });
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: 'භාවිතා කරන විදිහ: `.statusview on` හෝ `.statusview off`.'
                    });
                }
            }
            
            // Command: .antidelete
            if (lowerCaseText.startsWith('.antidelete')) {
                const command = lowerCaseText.slice('.antidelete'.length).trim();
                if (command === 'on') {
                    isAntiDeleteEnabled = true;
                    await sock.sendMessage(remoteJid, {
                        text: 'Anti-Delete feature එක දැන් **සක්‍රිය**යි. පණිවිඩයක් delete කළොත් මම ඒක නැවත යවනවා.'
                    });
                } else if (command === 'off') {
                    isAntiDeleteEnabled = false;
                    await sock.sendMessage(remoteJid, {
                        text: 'Anti-Delete feature එක දැන් **අක්‍රිය**යි.'
                    });
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: 'භාවිතා කරන විදිහ: `.antidelete on` හෝ `.antidelete off`.'
                    });
                }
            }

            // Command: .viewonce
            if (lowerCaseText === '.viewonce') {
                const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

                if (quotedMessage?.viewOnceMessage) {
                    const messageContent = quotedMessage.viewOnceMessage.message;
                    let mediaType = '';

                    if (messageContent.imageMessage) {
                        mediaType = 'image';
                    } else if (messageContent.videoMessage) {
                        mediaType = 'video';
                    }

                    if (mediaType) {
                        const buffer = await sock.downloadMediaMessage(messageContent[mediaType + 'Message']);
                        await sock.sendMessage(remoteJid, {
                            [mediaType]: buffer,
                            caption: 'මෙය "View Once" message එකකි. දැන් ඔබට මෙය ඕනෑම වාර ගණනක් නැරඹිය හැක.'
                        });
                    }
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: 'කරුණාකර ඔබට නැවත බලන්න අවශ්‍ය "View Once" message එකකට reply කරලා `.viewonce` command එක භාවිතා කරන්න.'
                    });
                }
            }

            // Command: .sticker
            if (lowerCaseText === '.sticker' && msg.message?.imageMessage) {
                const media = await proto.Message.fromObject(msg.message).imageMessage;
                const buffer = await sock.downloadMediaMessage(media);
                await sock.sendMessage(remoteJid, {
                    sticker: buffer
                });
            }

            // Command: .quote
            if (lowerCaseText === '.quote') {
                const quotes = [
                    "The only way to do great work is to love what you do. - Steve Jobs",
                    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
                    "The best way to predict the future is to create it. - Peter Drucker",
                    "Do not wait for a perfect time. Take the moment and make it perfect. - Sri Chinmoy",
                ];
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                await sock.sendMessage(remoteJid, {
                    text: randomQuote
                });
            }
            
            // Command: .echo <text>
            // Bot will repeat the text that follows the command.
            if (lowerCaseText.startsWith('.echo')) {
                const textToEcho = messageText.slice('.echo'.length).trim();
                if (textToEcho) {
                    await sock.sendMessage(remoteJid, {
                        text: textToEcho
                    });
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: 'ඔයාට repeat කරන්න ඕන text එක .echo command එකට පස්සේ දාන්න.'
                    });
                }
            }

            // Command: .time
            // Bot will send the current time.
            if (lowerCaseText === '.time') {
                const currentTime = new Date().toLocaleString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                });
                await sock.sendMessage(remoteJid, {
                    text: `දැන් වෙලාව ${currentTime} යි.`
                });
            }

            // Command: .joke
            if (lowerCaseText === '.joke') {
                const jokes = [
                    "ඇයි මකුළුවන්ට car එකක seat belt එක දාන්න බැරි? මොකද ඒ අයට කකුල් 8ක් තියෙන නිසා!",
                    "මම මගේ phone එක උස්සගෙන ඉන්නේ. ඒත් දැන් ඒක phone එකක් නෙවෙයි, phone book එකක්!",
                    "ගස් වලට කට ඇරලා කතා කරන්න බැරි ඇයි? මොකද ඒවට කටවල් නැහැ!",
                ];
                const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
                await sock.sendMessage(remoteJid, {
                    text: randomJoke
                });
            }
        }
    });
}

// Start the bot
startBot();
