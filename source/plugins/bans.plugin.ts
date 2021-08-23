import * as Discord from "discord.js"
import * as Fs from 'fs'
import * as Path from 'path'


import * as Lang from "../lang/plugins/bans.js"
import * as Plugin from "../modules/plugin.js"

import { embedFromMessage } from "../modules/embedMaker.js"
import * as Query from "../modules/inputCollector.js"

import { State } from "../modules/state.js"

import { plugin_folder } from "../config/server.json"

// ========== Plugin ==========
export default class Bans extends Plugin.Plugin
{
    name = "bans"
    description = Lang.bansDescription;

    state = new State( this.name );

    setupTemplate : Plugin.SetupTemplate = [
        { name: "log_channel", description: Lang.logChannelDescription, type: Plugin.InputType.Channel}
    ]

    async getLogChannel(): Promise<Discord.TextChannel | undefined>
	{
		return await this.getSetting<Discord.TextChannel>( "log_channel", Plugin.InputType.Channel );
	}

    commands = [
        new Ban(this, this.client)
    ]
}

// ========== Functions ==========

// ========== Chat Commands ==========

class Ban extends Plugin.ChatCommand
{
    private guild: Discord.Guild;

    constructor(private plugin: Bans, private client: Discord.Client)
    {
        super(Lang.banCommand);
        this.guild = client.guilds.cache.first() as Discord.Guild;
    }

    permission = Plugin.Permission.SuperMod;

    getHelpText()
	{
		return Lang.banHelp();
	}

    async run(message: Discord.Message, args: Array<string>): Promise<void>
    {
        let channel = message.channel;

		if (args.length === 0)
		{
			channel.send( this.getHelpText() );

			return;
		}

        switch(args[0])
        {
            case Lang.joinSinceCommand:
            {
                if(args.length < 2){
                    channel.send( this.getHelpText());

                    return;
                }

                let time = parseInt(args[1]);

                if(isNaN(time)){
                    channel.send(this.getHelpText());

                    return;
                }

                banTime(message, this.plugin.state, this.plugin, time, this.guild);
            }
            break;
        }
    }
}

// ========== Sub Commands ==========

async function banTime(message: Discord.Message, state: State, plugin: Bans, time: number, guild: Discord.Guild): Promise<void>
{
    let author = message.author;

    let timeNow = message.createdTimestamp;
    
    let banAfterTimestamp = timeNow - (time * 1000 * 60);

    let matchingUsers = guild.members.cache.filter(u => 
        {
            if(u.joinedTimestamp && u.joinedTimestamp >= banAfterTimestamp)
            {
                return true;
            }
            else
            {
                return false;
            }
        });

    
    let dir = `${plugin_folder}/bans/`;

    if(!Fs.existsSync(dir))
    {
        Fs.mkdirSync(dir, {recursive: true});
    }

    let logger = Fs.createWriteStream(dir + "banlog.txt", {flags: 'a'});

    matchingUsers.forEach(user => {
        logger.write(user.id + ' | ' + user.displayName + '\n');
        if(user.bannable){
            user.send(Lang.joinSinceMessage(user.id));
            user.ban();
        }
        else
        {
            message.channel.send(Lang.banPermissionMissing);
        }
    });

    logger.end();

    let logChannel = await plugin.getLogChannel();

    let embed = new Discord.MessageEmbed()
        .setColor('#ff0000')
        .setTitle(Lang.multiBanTitle(matchingUsers.size))
        .setDescription(Lang.multiBanSummary(matchingUsers.size, timeNow, banAfterTimestamp, message.author))
        .setTimestamp();

    let logFile = new Discord.MessageAttachment(dir + "banlog.txt");
    
    await logChannel?.send({embed: embed}, logFile);

    //await logChannel?.send(logFile);

    Fs.unlink(dir + "banlog.txt", (err) => {
        console.error(err);
        return;
    });
}