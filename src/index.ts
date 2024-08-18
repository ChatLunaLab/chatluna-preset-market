import { Context, Schema } from 'koishi'

import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { apply as commands } from './commands'

export function apply(ctx: Context, config: Config) {
    ctx.on('ready', async () => {
        commands(
            ctx,
            config
        )
    })
}

export interface Config extends ChatLunaPlugin.Config {
    repositoryEndpoints: string[]
}

export const Config = Schema.intersect([
    Schema.object({
        repositoryEndpoints: Schema.array(
            Schema.string()
        )
            .description('预设市场的接入地址（可以輸入多个仓库，前面仓库含有的预设将会被后面的覆盖，理解为先后覆盖）')
            .default(['https://mirror.ghproxy.com/https://raw.githubusercontent.com/ChatLunaLab/awesome-chatluna-presets'])
    }).description('请求配置')
]) as Schema<Config>

export const inject = ['chatluna']
