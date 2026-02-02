import "@/server/allow-only-server";

import { initTRPC, TRPCError } from "@trpc/server";
import { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { OpenApiMeta, OpenApiMethod } from "trpc-to-openapi";

import { getAuthenticatedUser } from "@/server/auth";

import type { User } from "@/generated/prisma/client";

export interface Context {
  req: NextApiRequest;
  res: NextApiResponse;
  user: User | null;
}

export interface ProtectedContext extends Context {
  user: User;
}

export async function createContext(opts: { req: NextApiRequest; res: NextApiResponse }): Promise<Context> {
  const user = await getAuthenticatedUser(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

const t = initTRPC.context<Context>().meta<OpenApiMeta>().create({
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
            },
        };
    },
});

export const router = t.router;
export const procedure = t.procedure;

/**
 * Defines a tRPC procedure that requires the user to be authenticated, also associating OpenAPI metadata with the procedure.
 * The procedure then needs to be given documentation via `.summary(...)`.
 */
export function protectedProcedure(method?: OpenApiMethod, path?: `/${string}`) {
  const authedProc = t.procedure.use(async (opts) => {
    const { ctx } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    
    return opts.next({ ctx: {...ctx, user: ctx.user } });
  });

  return {
    summary(summary: string) {
      if (method && path)
        return authedProc.meta({ openapi: { method, path, summary, protect: true } });

      return authedProc;
    }
  };
}

/**
 * Defines a tRPC procedure that does **not** require the user to be authenticated, also associating OpenAPI metadata with the procedure.
 * The procedure then needs to be given documentation via `.summary(...)`.
 */
export function publicProcedure(method?: OpenApiMethod, path?: `/${string}`) {
  return {
    summary(summary: string) {
      if (method && path)
        return procedure.meta({ openapi: { method, path, summary, protect: false } });

      return procedure;
    }
  };
}
