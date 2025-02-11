import { Context, Logger } from "koishi";
import { chatLunaFetch } from "koishi-plugin-chatluna/utils/request";
import fs from "fs/promises";
import { MarketPreset, MarketPresets } from "./types";

import { createLogger } from "koishi-plugin-chatluna/utils/logger";
import { PresetTemplate } from "koishi-plugin-chatluna/llm-core/prompt";
import { Config } from ".";
import { mergeMarketPresets } from "./utils";

let logger: Logger;

export function apply(ctx: Context, config: Config) {
    logger = createLogger(ctx, "chatluna-market");
    let marketPresets: MarketPresets;

    ctx.command("chatluna.market", "chathub 预设仓库相关命令");

    ctx.command("chatluna.market.list", "列出预设仓库的预设")
        .alias("预设仓库列表")
        .option("page", "-p <page:number> 选择页数", {
            authority: 1,
        })
        .option("type", "-t <type:string> 选择类型", {
            authority: 1,
        })
        .action(async ({ options, session }) => {
            let presets = await getPresetLists(config);

            marketPresets = presets;

            if (
                options.type != null &&
                !["main", "character"].includes(options.type)
            ) {
                return "预设类型错误，只能是 main 或者 character。";
            }

            presets = presets.filter(
                (preset) =>
                    options.type == null || preset.type === options.type,
            );

            if (presets.length === 0) {
                await session.send("当前没有预设");
                return;
            }

            const page = options.page ?? 1;

            const pageSize = 10;

            const start = (page - 1) * pageSize;

            const end = start + pageSize;

            const presetList = presets.slice(start, end);

            const buffer = ["预设列表：\n"];

            for (const preset of presetList) {
                buffer.push(`名称：${preset.name}`);

                buffer.push(`关键词: ${preset.keywords.join(" ,")}`);
                buffer.push(
                    `类型: ${preset.type === "main" ? "主插件预设" : "伪装预设"}`,
                );
                buffer.push("");
            }

            buffer.push(
                `当前页数：(${page}/${Math.ceil(presets.length / pageSize)}）`,
            );

            await session.send(buffer.join("\n"));
        });

    ctx.command("chatluna.market.search <keyword:string>", "搜索预设")
        .alias("搜索预设")
        .option("page", "-p <page:number> 选择页数", {
            authority: 1,
        })
        .option("type", "-t <type:string> 选择类型", {
            authority: 1,
        })
        .action(async ({ options, session }, keyword) => {
            const presets = await getPresetLists(config);

            if (
                options.type != null &&
                !["main", "character"].includes(options.type)
            ) {
                return "预设类型错误，只能是 main 或者 character。";
            }

            const presetList = presets.filter(
                (preset) =>
                    preset.keywords.some(
                        (_keyword) => _keyword.indexOf(keyword) !== -1,
                    ) &&
                    (options.type == null || preset.type === options.type),
            );

            marketPresets = presets;

            const page = options.page ?? 1;

            const pageSize = 10;

            const start = (page - 1) * pageSize;

            const end = start + pageSize;

            if (presetList.length === 0) {
                await session.send(`没有找到预设 ${keyword}`);
                return;
            }

            const buffer = [`以下是关于预设 ${keyword} 的结果：\n`];

            for (const preset of presetList) {
                buffer.push(`名称：${preset.name}`);
                buffer.push(`关键词: ${preset.keywords.join(" ,")}`);
                buffer.push(
                    `类型: ${preset.type === "main" ? "主插件预设" : "伪装预设"}`,
                );
                buffer.push("");
            }

            buffer.push(
                `当前页数：(${page}/${Math.ceil(presetList.length / pageSize)}）`,
            );

            await session.send(buffer.join("\n"));
        });

    ctx.command("chatluna.market.refresh", "刷新预设仓库")
        .alias("刷新预设仓库")
        .action(async ({ options, session }) => {
            const presets = await getPresetLists(config);

            marketPresets = presets;

            return `刷新预设仓库成功，快使用 chatluna.preset.list 查看吧`;
        });

    ctx.command("chatluna.market.download-all", "下载所有预设")
        .alias("下载所有预设")
        .action(async ({ options, session }) => {
            await session.send(
                `以下操作将会覆盖你本地的所有预设，请先备份你本地的预设，是否继续？输入 Y 确认，否则取消。`,
            );

            const prompt = await session.prompt(1000 * 30);

            if (!prompt || prompt !== "Y") {
                await session.send(`已取消下载所有预设`);
                return;
            }

            marketPresets = await getPresetLists(config);

            await session.send(
                `开始下载所有预设，总计 ${marketPresets.length} 个预设。可在控制台查看下载进度。`,
            );

            const result = await downloadAllPreset(ctx, marketPresets);

            await session.send(result);
        });

    ctx.command("chatluna.market.download <presetName:string>", "下载预设")
        .alias("下载预设")
        .action(async ({ options, session }, presetName) => {
            const presets = marketPresets ?? (await getPresetLists(config));

            const localPresetRepository = ctx.chatluna.preset;

            marketPresets = presets;

            const findPresets = presets.filter(
                (preset) =>
                    preset.name === presetName ||
                    preset.keywords.includes(presetName),
            );

            if (findPresets.length < 1) {
                await session.send(`没有找到预设 ${presetName}`);
                return;
            }

            let preset: MarketPreset;

            if (findPresets.length === 1) {
                preset = findPresets[0];
            } else {
                const buffer = ["找到多个预设，请输入下方序号选择：\n"];
                for (const preset of findPresets) {
                    buffer.push(`序号：${findPresets.indexOf(preset)}`);
                    buffer.push(`名称：${preset.name}`);
                    buffer.push(`关键词: ${preset.keywords.join(",")}`);
                    buffer.push(
                        `类型: ${preset.type === "main" ? "主插件预设" : "伪装预设"}`,
                    );
                    buffer.push("");
                }

                await session.send(buffer.join("\n"));

                const index = await session.prompt(1000 * 30);

                if (!index) {
                    await session.send(`超时，已取消下载预设 ${presetName}`);
                    return;
                }

                let indexNumber: number;
                try {
                    indexNumber = Number(index);
                } catch (error) {
                    await session.send(
                        `输入错误，已取消下载预设 ${presetName}`,
                    );
                    return;
                }

                preset = findPresets[indexNumber];
            }

            if (preset.type === "main") {
                let localPreset: PresetTemplate;

                for (const presetKeyWord of preset.keywords) {
                    localPreset = await localPresetRepository.getPreset(
                        presetKeyWord,
                        false,
                        false,
                    );
                }

                if (localPreset) {
                    await session.send(
                        `已经存在使用了同一关键词的预设 ${presetName}，回复大写 Y 则覆盖，否则取消。是否覆盖？`,
                    );

                    const input = await session.prompt(1000 * 30);

                    if (!input) {
                        await session.send(
                            `超时，已取消下载预设 ${presetName}`,
                        );
                        return;
                    } else if (input !== "Y") {
                        await session.send(`已取消下载预设 ${presetName}`);
                        return;
                    }
                }
            }

            await downloadPreset(ctx, preset);

            return `下载预设 ${presetName} 成功。`;
        });

    ctx.command("chatluna.market.upload", "上传预设")
        .alias("上传预设")
        .action(async ({ options, session }) => {
            return "非常抱歉，由于我们使用 GitHub 作为预设仓库，请有需要上传预设的用户前往此仓库提交 Pull Request: https://github.com/ChatHubLab/awesome-chathub-presets";
        });
}

async function getPresetList(repositoryEndpoint: string) {
    try {
        const response = await chatLunaFetch(
            `${repositoryEndpoint}/preset/presets.json`,
        );

        const rawText = await response.text();

        const presetList = JSON.parse(rawText) as MarketPresets;

        for (const preset of presetList) {
            preset.repositoryEndpoint = repositoryEndpoint;
        }

        fs.writeFile("./data/chathub/temp/preset_market.json", rawText);

        return presetList;
    } catch (error) {
        logger.error(error);
        if (error.cause) {
            logger.error(error.cause);
        }
        const rawText = (
            await fs.readFile("./data/chathub/temp/preset_market.json")
        ).toString("utf-8");

        const presetList = JSON.parse(rawText) as MarketPresets;

        return presetList;
    }
}

async function getPresetLists(config: Config) {
    const presetList: MarketPresets[] = await Promise.all(
        config.repositoryEndpoints.map((repositoryEndpoint) =>
            getPresetList(repositoryEndpoint),
        ),
    );

    return mergeMarketPresets(presetList);
}

async function downloadPreset(ctx: Context, preset: MarketPreset) {
    const { relativePath, repositoryEndpoint } = preset;
    const url = repositoryEndpoint.concat("/", relativePath);

    const response = await chatLunaFetch(url);

    const rawText = await response.text();

    let downloadPath =
        ctx.chatluna.preset.resolvePresetDir() + `/${preset.name}.yml`;

    if (preset.type === "character") {
        downloadPath =
            ctx.chatluna.preset.resolvePresetDir() +
            `/../character/presets/${preset.name}.yml`;
    }

    await fs.writeFile(downloadPath, rawText);
}

async function downloadAllPreset(ctx: Context, presets: MarketPreset[]) {
    const total = presets.length;
    let success = 0;
    let failed = 0;

    const chunkedPresets = chunkArray(presets, 6).map(async (presets) => {
        for (const preset of presets) {
            const presetName = preset.name;

            let isSuccess = false;
            try {
                await downloadPreset(ctx, preset);
                success++;
                isSuccess = true;
            } catch (error) {
                ctx.logger.error(error);
                if (error.cause) {
                    ctx.logger.error(error.cause);
                }
                failed++;
            }

            ctx.logger.success(
                `下载预设 ${presetName} ${isSuccess ? "成功" : "失败"}, 成功: ${success}, 失败: ${failed}, 总数: ${total}`,
            );
        }
    });

    await Promise.all(chunkedPresets);

    return `下载预设完成，成功: ${success}, 失败: ${failed}, 总数: ${total}`;
}

export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        result.push(arr.slice(i, i + chunkSize));
    }
    return result;
}
