// jid.js
const { cmd } = require('../command');

// keep pending requests in global so restart-safe in same process
global._jidPending = global._jidPending || new Map();
global._jidListenerAttached = global._jidListenerAttached || false;
const pending = global._jidPending;

cmd({
    pattern: "jid",
    desc: "Resolve WhatsApp channel link to real numeric JID (requires bot to receive channel message or forwarded post).",
    category: "main",
    react: "🔎",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("Please provide a WhatsApp channel link.\nUsage: .jid <channel_link>\nExample: .jid https://whatsapp.com/channel/0029Vb6BQQmFnSz7bmxefu40");

        // attach global listener once (if supported by conn)
        if (conn && conn.ev && !global._jidListenerAttached) {
            global._jidListenerAttached = true;

            conn.ev.on('messages.upsert', async (up) => {
                try {
                    const msgs = up.messages || [];
                    for (const msg of msgs) {
                        if (!msg || !msg.message) continue;

                        // 1) direct channel message (bot followed the channel) => remoteJid contains numeric @newsletter
                        const remote = msg.key && msg.key.remoteJid ? msg.key.remoteJid : '';
                        if (remote && remote.endsWith('@newsletter')) {
                            // notify all pending (best-effort). If you want stricter matching,
                            // you can try to match based on stored channelHash if known.
                            for (const [channelHash, info] of Array.from(pending.entries())) {
                                try {
                                    await conn.sendMessage(info.from, {
                                        text: `Detected channel numeric JID: ${remote}\n(If you followed the channel on the bot account just now, this is the real numeric JID for your requested link: ${channelHash})`
                                    }, { quoted: msg }).catch(()=>{});
                                } catch(e){}
                                pending.delete(channelHash);
                            }
                            continue;
                        }

                        // 2) forwarded message context may include original participant / remoteJid in contextInfo
                        const ctx = msg.message.extendedTextMessage?.contextInfo || msg.message?.contextInfo || null;
                        if (ctx) {
                            // some forwarded context contains 'participant' or 'stanzaId' with newsletter JID
                            const participant = ctx.participant || ctx.remoteJid || ctx.forwardingScore && ctx.participant;
                            if (participant && participant.endsWith && participant.endsWith('@newsletter')) {
                                const discovered = participant;
                                for (const [channelHash, info] of Array.from(pending.entries())) {
                                    try {
                                        await conn.sendMessage(info.from, {
                                            text: `Detected channel numeric JID from forwarded context: ${discovered}\n(Forward came from channel: ${channelHash})`
                                        }, { quoted: msg }).catch(()=>{});
                                    } catch(e){}
                                    pending.delete(channelHash);
                                }
                                continue;
                            }
                            // some context may have externalAdReply with sourceUrl including the channel hash — optional improvement
                            const ext = ctx.externalAdReply;
                            if (ext && ext.sourceUrl) {
                                // try to extract channel hash from sourceUrl and notify mapping if known
                                const su = ext.sourceUrl;
                                const parts = su.split('/');
                                const maybeHash = parts[parts.length - 1];
                                if (maybeHash && pending.has(maybeHash) && remote && remote.endsWith('@newsletter')) {
                                    const info = pending.get(maybeHash);
                                    try {
                                        await conn.sendMessage(info.from, { text: `Detected numeric JID: ${remote}\n(for channel: ${maybeHash})` }, { quoted: msg }).catch(()=>{});
                                    } catch(e){}
                                    pending.delete(maybeHash);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('jid listener error', e);
                }
            });

            // also listen for chat upserts (bot account gained new chat -> might be channel)
            if (conn.ev && conn.ev.on) {
                conn.ev.on('chats.update', async (chs) => {
                    try {
                        const arr = Array.isArray(chs) ? chs : [chs];
                        for (const ch of arr) {
                            if (!ch || !ch.id) continue;
                            if (ch.id.endsWith && ch.id.endsWith('@newsletter')) {
                                for (const [channelHash, info] of Array.from(pending.entries())) {
                                    try {
                                        await conn.sendMessage(info.from, { text: `Bot added channel chat: ${ch.id}\n(If you just opened the channel link on the bot account, this is likely the numeric JID for: ${channelHash})` }).catch(()=>{});
                                    } catch(e){}
                                    pending.delete(channelHash);
                                }
                            }
                        }
                    } catch(e){}
                });
            }
        }

        // parse link and channelHash
        const link = q.trim();
        const parts = link.split('/');
        const channelHash = parts[parts.length - 1] || link; // fallback

        // store pending request with timestamp and requester JID
        pending.set(channelHash, { from, ts: Date.now() });

        // instruct user how to complete
        const instructions = [
            `I couldn't automatically resolve numeric JID immediately.`,
            ``,
            `To get the REAL numeric JID, do one of the following:`,
            `1) Open the channel link *using the SAME WhatsApp account that the bot is logged in with*.`,
            `   - If the bot account follows the channel, I will detect the numeric JID and reply here automatically.`,
            ``,
            `OR`,
            ``,
            `2) Ask any follower of that channel to *forward any post* from the channel to this bot (forward a message from the channel into this chat).`,
            `   - When I receive the forwarded message I'll extract the numeric @newsletter JID and reply.`,
            ``,
            `After doing either, wait a short moment — I will reply with the numeric JID here automatically.`,
            ``,
            `If you want, forward the channel link or a sample forwarded post right now.`
        ].join('\n');

        await conn.sendMessage(from, { text: instructions }, { quoted: mek });

        // optional: auto-clean pending after 10 minutes
        setTimeout(() => {
            if (pending.has(channelHash)) pending.delete(channelHash);
        }, 10 * 60 * 1000);

    } catch (e) {
        console.error(e);
        reply(`Error getting numeric JID: ${e.message}`);
    }
});
