import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import { tokenSplit } from '@/api/controllers/core.ts';
import { generateVideo, DEFAULT_MODEL } from '@/api/controllers/videos.ts';
import util from '@/lib/util.ts';

export default {

    prefix: '/v1/videos',

    post: {

        '/generations': async (request: Request) => {
            request
                .validate('body.model', v => _.isUndefined(v) || _.isString(v))
                .validate('body.prompt', _.isString)
                .validate('body.width', v => _.isUndefined(v) || _.isFinite(v))
                .validate('body.height', v => _.isUndefined(v) || _.isFinite(v))
                .validate('body.resolution', v => _.isUndefined(v) || _.isString(v))
                .validate('body.file_paths', v => _.isUndefined(v) || _.isArray(v))
                .validate('body.filePaths', v => _.isUndefined(v) || _.isArray(v))
                .validate('body.images_urls', v => _.isUndefined(v) || _.isArray(v))
                .validate('body.imagesUrls', v => _.isUndefined(v) || _.isArray(v))
                .validate('body.response_format', v => _.isUndefined(v) || _.isString(v))
                .validate('headers.authorization', _.isString);

            // refresh_token切分
            const tokens = tokenSplit(request.headers.authorization);
            // 随机挑选一个refresh_token
            const token = _.sample(tokens);

            const {
                model = DEFAULT_MODEL,
                prompt,
                width = 1024,
                height = 1024,
                resolution = "720p",
                file_paths = [],
                filePaths = [],
                images_urls = [],
                imagesUrls = [],
                response_format = "url"
            } = request.body;
            
            // 兼容两种参数名格式：file_paths 和 filePaths
            const finalFilePaths = filePaths.length > 0 ? filePaths : file_paths;
            // 兼容两种参数名格式：images_urls 和 imagesUrls
            const finalImageUrls = imagesUrls.length > 0 ? imagesUrls : images_urls;
            const hasImageUrlsInput = _.has(request.body, 'images_urls') || _.has(request.body, 'imagesUrls');

            const generationOptions = {
                width,
                height,
                resolution,
                filePaths: finalFilePaths
            } as {
                width?: number;
                height?: number;
                resolution?: string;
                filePaths?: string[];
                imageUrls?: string[];
            };

            if (hasImageUrlsInput) {
                generationOptions.imageUrls = finalImageUrls;
            }

            // 生成视频
            const videoUrl = await generateVideo(
                model,
                prompt,
                generationOptions,
                token
            );
            // 根据response_format返回不同格式的结果
            if (response_format === "b64_json") {
                // 获取视频内容并转换为BASE64
                const videoBase64 = await util.fetchFileBASE64(videoUrl);
                return {
                    created: util.unixTimestamp(),
                    data: [{
                        b64_json: videoBase64,
                        revised_prompt: prompt
                    }]
                };
            } else {
                // 默认返回URL
                return {
                    created: util.unixTimestamp(),
                    data: [{
                        url: videoUrl,
                        revised_prompt: prompt
                    }]
                };
            }
        }

    }

}
