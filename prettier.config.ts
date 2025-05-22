/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 04:39:58
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
import { type Config } from "prettier";

const config: Config = {
    "plugins": [
        "tailwindStylesheet: app/globals.css",
        "prettier-plugin-tailwindcss",

    ],
    tailwindcss: {
        config: "./tailwind.config.ts",
    },
}
export default config;
