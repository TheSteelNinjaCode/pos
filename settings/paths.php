<?php

/**
 * @var string SETTINGS_PATH - The absolute path to the settings directory ./settings
 */
define("SETTINGS_PATH", dirname(__FILE__));
/**
 * @var string PRISMA_LIB_PATH - The absolute path to the Prisma library directory ./src/Lib/Prisma
 */
define("PRISMA_LIB_PATH", dirname(SETTINGS_PATH) . "/src/Lib/Prisma");
/**
 * @var string SRC_PATH - The absolute path to the src directory ./src
 */
define("SRC_PATH", dirname(SETTINGS_PATH) . "/src");
/**
 * @var string APP_PATH - The absolute path to the app directory ./src/app
 */
define("APP_PATH", dirname(SETTINGS_PATH) . "/src/app");
/**
 * @var string LIB_PATH - The absolute path to the layout directory ./src/Lib
 */
define("LIB_PATH", dirname(SETTINGS_PATH) . "/src/Lib");
/**
 * @var string DOCUMENT_PATH - The absolute path to the layout directory ./
 */
define("DOCUMENT_PATH", dirname(SETTINGS_PATH));
