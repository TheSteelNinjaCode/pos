<?php use Lib\ErrorHandler; ?>

<div class="flex items-center justify-center">
    <div class="text-center max-w-md">
        <h1 class="text-6xl font-bold text-red-500">Oops!</h1>
        <p class="text-xl mt-4"><?= ErrorHandler::$content ?></p>
        <div class="mt-6">
            <a href="/" class="px-6 py-3 text-lg font-semibold bg-red-500 hover:bg-red-600 rounded-lg shadow-md">Go Back Home</a>
        </div>
    </div>
</div>