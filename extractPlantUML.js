#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Проверка наличия аргумента
if (process.argv.length < 3) {
    console.error("Использование: node extractPlantUML.js <путь к папке>");
    process.exit(1);
}

const folderPath = path.resolve(process.argv[2]);

// Проверка, что указанная директория существует
if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    console.error("Указанная папка не существует или не является директорией:", folderPath);
    process.exit(1);
}

/**
 * Рекурсивно ищет md файлы в указанной папке.
 * @param {string} dir - Путь к директории для поиска.
 * @returns {string[]} Массив путей к md файлам.
 */
function getMdFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getMdFiles(filePath));
        } else if (path.extname(file).toLowerCase() === '.md') {
            results.push(filePath);
        }
    });
    return results;
}

const mdFiles = getMdFiles(folderPath);

if (mdFiles.length === 0) {
    console.log("Не найдено md файлов в папке:", folderPath);
    process.exit(0);
}

console.log(`Найдено ${mdFiles.length} md файл(ов).`);

mdFiles.forEach(mdFilePath => {
    console.log(`\nОбработка файла: ${mdFilePath}`);

    let data;
    try {
        data = fs.readFileSync(mdFilePath, 'utf8');
    } catch (err) {
        console.error("Ошибка чтения файла:", err);
        return;
    }

    // Регулярное выражение для поиска блоков plantuml
    const regex = /```plantuml\s*([\s\S]*?)```/g;
    let match;
    let diagramIndex = 1;

    // Определяем путь к папке resources рядом с md файлом
    const mdDir = path.dirname(mdFilePath);
    const resourcesDir = path.join(mdDir, 'resources');

    if (!fs.existsSync(resourcesDir)) {
        try {
            fs.mkdirSync(resourcesDir);
            console.log(`  Создана папка: ${resourcesDir}`);
        } catch (err) {
            console.error("Ошибка создания папки:", err);
            return;
        }
    }

    // Получаем имя md файла без расширения для формирования имен puml файлов
    const mdFileName = path.basename(mdFilePath, path.extname(mdFilePath));

    // Поиск всех блоков plantuml в md файле
    while ((match = regex.exec(data)) !== null) {
        let umlContent = match[1].trim();

        // Если блок не содержит @startuml, оборачиваем его
        if (!umlContent.startsWith('@startuml')) {
            umlContent = `@startuml\n${umlContent}\n@enduml`;
        }

        // Формирование имени файла: <имя md файла>_<номер>.puml
        const fileName = `${mdFileName}_${diagramIndex}.puml`;
        const filePath = path.join(resourcesDir, fileName);

        try {
            fs.writeFileSync(filePath, umlContent, 'utf8');
            console.log(`  Создан файл: ${filePath}`);
        } catch (err) {
            console.error(`Ошибка записи файла ${filePath}:`, err);
        }

        diagramIndex++;
    }

    if (diagramIndex === 1) {
        console.log("  Блоки plantuml не найдены в файле.");
    }
});
