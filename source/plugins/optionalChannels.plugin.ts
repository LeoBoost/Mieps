import * as lang from "../lang/plugins/optionalChannels.js";
import * as Plugin from "../modules/plugin.js";
import { State } from "../modules/state.js";

import * as Discord from "discord.js";
import { types } from "util";
import { uncaughtError } from "../modules/errorHandling.js";

// ========== Plugin ==========

export default class OptionalChannels extends Plugin.Plugin {
	name = "optional_channels";
	description = lang.optInDescription;

	state = new State(this.name);

	channels: Array<Channel> | undefined;

	setupTemplate: Plugin.SetupTemplate = [
		{name: "optin_channel_names", description: lang.optInChannelList, type: Plugin.InputType.TextList},
		{name: "optin_roles", description: lang.optInRole, type: Plugin.InputType.RoleList},
		{name: "optout_channel_names", description: lang.optOutChannelList, type: Plugin.InputType.TextList},
		{name: "optout_roles", description: lang.optOutRole, type: Plugin.InputType.RoleList}
	]

	// Get settings and constructs usable Arrays
	async init(): Promise<void> {
		let optInChannelNames = await this.getSetting("optin_channel_names", Plugin.InputType.TextList) as Array<string> || [] as Array<string>;
		let optInRoles = await this.getSetting("optin_roles", Plugin.InputType.RoleList) as [] || [];

		let optOutChannelNames = await this.getSetting("optout_channel_names", Plugin.InputType.TextList) as Array<string> || [] as Array<string>;
		let optOutRoles = await this.getSetting("optout_roles", Plugin.InputType.RoleList) as [] || [];
	
		let optInCount = Math.min(optInChannelNames.length, optInRoles.length);
		let optOutCount = Math.min(optOutChannelNames.length, optOutRoles.length);

		if (optInCount > 0 || optOutCount > 0) {
			this.channels = [];
		} else {
			this.channels = undefined;
		}

		for (let i = 0; i < optInCount; i++) {
			this.channels?.push({
				name: optInChannelNames[i].trim(),
				role: optInRoles[i],
				optin: true
			});		
		}

		for (let i = 0; i < optOutCount; i++) {
			this.channels?.push({
				name: optOutChannelNames[i].trim(),
				role: optOutRoles[i],
				optin: false
			});		
		}
		
		this.commands.push(new JoinLeave(true, this));
		this.commands.push(new JoinLeave(false, this));
	}

	commands: Array<JoinLeave> = []
}

// ========== Interfaces ==========

interface Channel {
	name: string,
	role: Discord.Role,
	optin: boolean
}

// ========== Chat Commands ==========

class JoinLeave extends Plugin.ChatCommand {
	// If this is a join, or leave command
	join: boolean;
	plugin: OptionalChannels;
	channelNameList: Array<string>;

	permission = Plugin.Permission.User;

	constructor(join: boolean, plugin: OptionalChannels) {
		super((join) ? "join" : "leave");
		this.join = join;
		this.plugin = plugin;
		this.channelNameList = [];

		this.plugin.channels?.forEach(channel => {
			this.channelNameList.push(channel.name);
		});
	}

	getHelpText() {
		return lang.help(this.channelNameList, this.join);
	}

	async run(message: Discord.Message, args: Array<string>): Promise<void> {
		let channel = message.channel;
		
		if (args.length === 0) {
			channel.send(this.getHelpText());
			return;
		}

		// join / leave all channels
		if (args[0] === "all") {
			this.plugin.channels?.forEach(channel => {
				(this.join) ? joinChannel(message.member, channel) : leaveChannel(message.member, channel)
			});

			channel.send((this.join) ? lang.joinedAll : lang.leftAll);
			return;
		}

		let channelName = args[0];
		let channelObj = this.plugin.channels?.find(channel => channel.name.toLowerCase() === channelName);

		// feedback for no channel with that name found
		if (!channelObj) {
			channel.send(lang.channelNotFound(this.channelNameList, this.join));
			return;
		}


		let r: Returns;

		// join / leave channel
		if (this.join) {
			r = joinChannel(message.member, channelObj);
		} else {
			r = leaveChannel(message.member, channelObj);
		}

		if (r !== Returns.Failed) {
			channel.send((this.join) ? lang.joined : lang.left);
		} else {
			uncaughtError(this.plugin.pluginManager.controlChannel, (this.join) ? "join" : "leave", undefined, message.content);
		}
	}
}

// ========== Functions ==========

enum Returns {
	Joined,
	Left,
	Failed
}

function joinChannel(member: Discord.GuildMember | null, channel: Channel): Returns {
	try {
		if (channel.optin) {
			member?.roles.add(channel.role, "optional join");
		} else {
			member?.roles.remove(channel.role, "optional join");
		}
	} catch(e) {
		return Returns.Failed;
	}
	
	return Returns.Joined;
}

function leaveChannel(member: Discord.GuildMember | null, channel: Channel): Returns {
	try {
		if (channel.optin) {
			member?.roles.remove(channel.role, "optional leave");
		} else {
			member?.roles.add(channel.role, "optional leave");
		}
	} catch(e) {
		return Returns.Failed;
	}
	
	return Returns.Left;
}
