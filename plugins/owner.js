const { cmd } = require('../command');

cmd({
    pattern: "block",
    react: "⚠️",
    alias: ["banuser"],
    desc: "Block a user instantly.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { quoted, reply, isOwner }) => {
    try {
        if (!isOwner) return reply("⚠️ Only the owner can use this command!");
        if (!m.quoted) return reply("⚠️ Please reply to the user's message to block them!");

        const target = m.quoted.sender;
        await malvin.updateBlockStatus(target, "block");
        return reply(`✅ Successfully blocked: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Block Error:", e);
        return reply(`❌ Failed to block the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "kick1",
    alias: ["remove"],
    react: "⚠️",
    desc: "Remove a mentioned user from the group.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");
        if (!m.quoted) return reply("⚠️ Please reply to the user's message you want to kick!");

        const target = m.quoted.sender;
        const groupMetadata = await malvin.groupMetadata(from);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);

        if (groupAdmins.includes(target)) return reply("⚠️ I cannot remove another admin from the group!");

        await malvin.groupParticipantsUpdate(from, [target], "remove");
        return reply(`✅ Successfully removed: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Kick Error:", e);
        reply(`❌ Failed to remove the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "left1",
    alias: ["leave", "exit"],
    react: "⚠️",
    desc: "Leave the current group.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isOwner, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isOwner) return reply("⚠️ Only the owner can use this command!");
        await malvin.groupLeave(from);
    } catch (e) {
        console.error("Leave Error:", e);
        reply(`❌ Failed to leave the group. Error: ${e.message}`);
    }
});

cmd({
    pattern: "mute1",
    alias: ["silence", "lock"],
    react: "⚠️",
    desc: "Set group chat to admin-only messages.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ This command is only for group admins!");
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        await malvin.groupSettingUpdate(from, "announcement");
        return reply("✅ Group has been muted. Only admins can send messages now!");
    } catch (e) {
        console.error("Mute Error:", e);
        reply(`❌ Failed to mute the group. Error: ${e.message}`);
    }
});

cmd({
    pattern: "unmute",
    alias: ["unlock"],
    react: "⚠️",
    desc: "Allow everyone to send messages in the group.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ This command is only for group admins!");
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");

        await malvin.groupSettingUpdate(from, "not_announcement");
        return reply("✅ Group has been unmuted. Everyone can send messages now!");
    } catch (e) {
        console.error("Unmute Error:", e);
        reply(`❌ Failed to unmute the group. Error: ${e.message}`);
    }
});

cmd({
    pattern: "add",
    alias: ["invite"],
    react: "➕",
    desc: "Add a user to the group.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply, args }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");
        if (!args[0]) return reply("⚠️ Please provide the phone number of the user to add!");

        const target = args[0].includes("@") ? args[0] : `${args[0]}@s.whatsapp.net`;
        await malvin.groupParticipantsUpdate(from, [target], "add");
        return reply(`✅ Successfully added: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Add Error:", e);
        reply(`❌ Failed to add the user. Error: ${e.message}`);
    }
});

cmd({
    pattern: "demote1",
    alias: ["member"],
    react: "⚠️",
    desc: "Remove admin privileges from a mentioned user.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");
        if (!m.quoted) return reply("⚠️ Please reply to the user's message you want to remove admin privileges from!");

        const target = m.quoted.sender;
        if (target === m.sender) return reply("⚠️ You cannot remove your own admin privileges!");

        await malvin.groupParticipantsUpdate(from, [target], "demote");
        return reply(`✅ Successfully removed admin privileges from: @${target.split('@')[0]}`);
    } catch (e) {
        console.error("Demote Error:", e);
        reply(`❌ Failed to remove admin privileges. Error: ${e.message}`);
    }
});

cmd({
    pattern: "promote1",
    alias: ["admin", "makeadmin"],
    react: "⚡",
    desc: "Grant admin privileges to a mentioned user.",
    category: "main",
    filename: __filename
},
async (malvin, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("⚠️ This command can only be used in a group!");
        if (!isAdmins) return reply("⚠️ Only group admins can use this command!");
        if (!isBotAdmins) return reply("⚠️ I need to be an admin to execute this command!");
        if (!m.quoted) return reply("⚠️ Please reply to the user's message you want to promote to admin!");

        const target = m.quoted.sender;
        const groupMetadata = await malvin.groupMetadata(from);
        const groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);

        if (groupAdmins.includes(target)) return reply("⚠️ The mentioned user is already an admin!");

        await malvin.groupParticipantsUpdate(from, [target], "promote");
        return reply(`✅ Successfully promoted @${target.split('@')[0]} to admin!`);
    } catch (e) {
        console.error("Promote Error:", e);
        reply(`❌ Failed to promote the user. Error: ${e.message}`);
    }
});        reply(`❌ Error: ${e.message}`);
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
});});

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
        if (!isBotSender(m, malvin)) return reply("⚠️ Only the bot can use this command!");

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
