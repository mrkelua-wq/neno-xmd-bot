const { cmd } = require("../command");

// 🔑 Check if sender can use command (bot number or admin)
function canUseCommand(m, malvin, isAdmins) {
    const botNumber = malvin.user?.id?.split(":")[0] || "";
    const sender = m.sender || "";
    return sender.includes(botNumber) || isAdmins;
}

// 🛑 BLOCK
cmd({
    pattern: "block",
    react: "🚫",
    alias: ["banuser"],
    desc: "Block a user instantly.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { reply }) => {
    try {
        if (!canUseCommand(m, malvin, false)) return reply("⚠️ Only bot or admins can use this command!");
        if (!m.quoted) return reply("⚠️ Reply to the user you want to block!");

        const target = m.quoted.sender;
        await malvin.updateBlockStatus(target, "block");
        return reply(`✅ Blocked: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Block Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 👢 KICK
cmd({
    pattern: "kick",
    react: "👢",
    alias: ["remove"],
    desc: "Remove a replied user.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        if (!canUseCommand(m, malvin, isAdmins)) return reply("⚠️ Only bot or admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ Bot must be admin!");
        if (!m.quoted) return reply("⚠️ Reply to the user you want to kick!");

        const target = m.quoted.sender;
        await malvin.groupParticipantsUpdate(from, [target], "remove");
        return reply(`✅ Kicked: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Kick Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 🧹 KICK ALL
cmd({
    pattern: "kickall",
    react: "🧹",
    desc: "Remove all non-admin members.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        if (!canUseCommand(m, malvin, isAdmins)) return reply("⚠️ Only bot or admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ Bot must be admin!");

        const groupMetadata = await malvin.groupMetadata(from);
        const members = groupMetadata.participants;
        const targets = members.filter(p => !p.admin).map(p => p.id);

        for (let user of targets) {
            await malvin.groupParticipantsUpdate(from, [user], "remove");
        }
        return reply("✅ All non-admin members removed.");
    } catch (e) {
        console.error("KickAll Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 📢 TAG ALL
cmd({
    pattern: "tagall",
    react: "📢",
    desc: "Mention all members.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");

        const botNumber = malvin.user?.id?.split(":")[0] || "";
        const sender = m.sender || "";
        if (!(sender.includes(botNumber) || isAdmins)) return reply("⚠️ Only bot or admins can use this command!");

        const groupMetadata = await malvin.groupMetadata(from);
        const members = groupMetadata.participants;

        let text = "📢 *Tagging all members:*\n\n";
        members.forEach(u => text += `@${u.id.split("@")[0]} `);

        return malvin.sendMessage(from, { text, mentions: members.map(u => u.id) });
    } catch (e) {
        console.error("TagAll Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 🔇 MUTE
cmd({
    pattern: "mute",
    react: "🔇",
    alias: ["silence", "lock"],
    desc: "Admin-only mode.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        if (!canUseCommand(m, malvin, isAdmins)) return reply("⚠️ Only bot or admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ Bot must be admin!");

        await malvin.groupSettingUpdate(from, "announcement");
        return reply("✅ Group muted. Only admins can chat.");
    } catch (e) {
        console.error("Mute Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 🔊 UNMUTE
cmd({
    pattern: "unmute",
    react: "🔊",
    alias: ["unlock"],
    desc: "Allow all members to chat.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        if (!canUseCommand(m, malvin, isAdmins)) return reply("⚠️ Only bot or admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ Bot must be admin!");

        await malvin.groupSettingUpdate(from, "not_announcement");
        return reply("✅ Group unmuted. Everyone can chat.");
    } catch (e) {
        console.error("Unmute Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// 🚪 LEAVE
cmd({
    pattern: "left",
    react: "🚪",
    alias: ["leave", "exit"],
    desc: "Bot leaves group.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        const botNumber = malvin.user?.id?.split(":")[0] || "";
        if (!m.sender.includes(botNumber)) return reply("⚠️ Only bot can use this command!");

        await malvin.groupLeave(from);
    } catch (e) {
        console.error("Leave Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ⬆️ PROMOTE
cmd({
    pattern: "promote",
    react: "⬆️",
    desc: "Promote a user to admin.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        if (!canUseCommand(m, malvin, isAdmins)) return reply("⚠️ Only bot or admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ Bot must be admin!");
        if (!m.quoted) return reply("⚠️ Reply to the user to promote!");

        const target = m.quoted.sender;
        await malvin.groupParticipantsUpdate(from, [target], "promote");
        return reply(`✅ Promoted: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Promote Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});

// ⬇️ DEMOTE
cmd({
    pattern: "demote",
    react: "⬇️",
    desc: "Demote an admin to member.",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ Group only!");
        if (!canUseCommand(m, malvin, isAdmins)) return reply("⚠️ Only bot or admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ Bot must be admin!");
        if (!m.quoted) return reply("⚠️ Reply to the user to demote!");

        const target = m.quoted.sender;
        await malvin.groupParticipantsUpdate(from, [target], "demote");
        return reply(`✅ Demoted: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Demote Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
