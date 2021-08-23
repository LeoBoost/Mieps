import * as Discord from "discord.js"

import { command_prefix } from "../../config/server.json"

export const bansDescription = `Erlaubt es User zu bannen`;
export const logChannelDescription = `Der Kanal in welchem die Ban-Logs gespeichert werden`;

export const banCommand = `ban`;

export function banHelp(): string
{
    return `"${command_prefix}ban joinvor x", um alle User zu bannen, die in den letzten x Minuten gejoint sind.`;
}

export const joinSinceCommand = `joinvor`;

export function joinSinceMessage(userId: string): string
{
    return `Hi <@${userId}>! Du wurdest leider gerade von TG Deutschland gebannt. Falls du findest, dass das unfair war, findest du Kontaktdaten auf https://tg-deutschland.org`;
}

export function logMessage(): string
{
    return ``;
}

export const banPermissionMissing = 'Leider fehlen Mieps Berechtigungen, um User zu bannen, oder der User hat einen höheren Rang als Mieps.';
export function multiBanTitle(amount: number): string
{
    return `${amount} User gebannt`;
}

/**
 * 
 * @param amount The amount of users banned
 * @param timeWhen The time when the ban command was issued
 * @param timeFrom The time from when onwards joining users were banned
 * @param banningMod The mod that issued the ban command
 * @returns 
 */
export function multiBanSummary(amount: number, timeWhen: number, timeFrom: number, banningMod: Discord.User): string
{
    let issuedDate = new Date(timeWhen);
    let fromDate = new Date(timeFrom);

    return `<@${banningMod.id}> hat ${amount} User gebannt, die zwischen ${fromDate.getTime()} und ${issuedDate.getTime()} gejoint sind.`;
}