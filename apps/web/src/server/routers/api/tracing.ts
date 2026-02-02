import "@/server/allow-only-server";

import { z } from "zod";

import { apiOk, apiResult } from "@/shared/common";

import { router, protectedProcedure } from "@/server/trpc";
import { logTracing } from "@/server/serverCommon";

// These endpoints are used for internal statistics. All tracing is anonymized.
// Some of the endpoints in this router will be removed after the beta period ends.

export default router({
    traceEncodeStart: protectedProcedure()
        .summary("Provides the server with client-side information about a local video encoding job.")
        .input(
            z.object({
                supportedCodecs: z.array(z.string())
                    .describe("All of the supported video codecs that can be used to encode the video."),

                usedCodec: z.string().nullable()
                    .describe("The codec used to encode the video."),

                inputs: z.array(z.object({
                    codec: z.string().nullable(),
                    codedWidth: z.number(),
                    codedHeight: z.number(),
                    displayWidth: z.number(),
                    displayHeight: z.number(),
                    duration: z.number()
                }).nullable())
                    .describe("Statistics for all input chunks.")
            })
        )
        .output(apiResult({}))
        .query(async (req) => {
            logTracing("encodeStart", req.input);
            return apiOk({});
        })
});
