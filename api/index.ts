import "dotenv/config";
import express from "express";
import { registerSupabaseRoutes } from "../server/supabaseRoutes.ts";

const app = express();
registerSupabaseRoutes(app);

export default app;
