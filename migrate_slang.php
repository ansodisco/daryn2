<?php
// Migration script to add slang tables and data
require_once __DIR__ . '/includes/config.php';

$db = getDB();

try {
    // Create slang table
    $db->exec('
    CREATE TABLE IF NOT EXISTS slang (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        kazakh          VARCHAR(255) NOT NULL UNIQUE,
        english         VARCHAR(255) NOT NULL,
        russian         VARCHAR(255) NOT NULL,
        explanation_en  TEXT,
        explanation_kk  TEXT,
        explanation_ru  TEXT,
        example_sentence_kk TEXT,
        example_sentence_en TEXT,
        example_sentence_ru TEXT,
        context_en      VARCHAR(255),
        context_kk      VARCHAR(255),
        context_ru      VARCHAR(255),
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ');

    // Create user_learned_slang table
    $db->exec('
    CREATE TABLE IF NOT EXISTS user_learned_slang (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        slang_id    INT NOT NULL,
        learned_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        proficiency INT DEFAULT 1,
        UNIQUE KEY uq_user_slang (user_id, slang_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (slang_id) REFERENCES slang(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ');

    // Add sample slang
    $sampleSlang = [
        [
            'kazakh' => 'Қоян',
            'english' => 'Cool / Awesome',
            'russian' => 'Классный / Крутой',
            'explanation_en' => 'An expression used among youth to describe something amazing or impressive',
            'explanation_kk' => 'Жастарда қолданылатын ажарлы немесе әсерлі нәрсені сипаттау үшін қолданылады',
            'explanation_ru' => 'Выражение, используемое молодежью для описания чего-то потрясающего или впечатляющего',
            'example_sentence_kk' => 'Сіңді компьютері қоян!',
            'example_sentence_en' => 'Your computer is so cool!',
            'example_sentence_ru' => 'Твой компьютер очень крутой!',
            'context_en' => 'Informal, among friends or younger people',
            'context_kk' => 'Дооставырлық, достарының арасында',
            'context_ru' => 'Неформальный, среди друзей'
        ],
        [
            'kazakh' => 'Фотка',
            'english' => 'Photo / Picture',
            'russian' => 'Фотография / Кадр',
            'explanation_en' => 'Abbreviation of фотография commonly used in casual speech',
            'explanation_kk' => 'Фотография сөзінің қысқартылған нұсқасы, күнделікті сөйлеуде жиі қолданылады',
            'explanation_ru' => 'Сокращение слова фотография, часто используется в повседневной речи',
            'example_sentence_kk' => 'Менің фоткамды қараңыз!',
            'example_sentence_en' => 'Look at my photo!',
            'example_sentence_ru' => 'Посмотрите мою фотку!',
            'context_en' => 'Very common in social media and everyday conversation',
            'context_kk' => 'Әлеуметтік желілерде және күнделікті сөйлеуде өте кең таралды',
            'context_ru' => 'Очень распространено в социальных сетях и повседневной речи'
        ],
        [
            'kazakh' => 'Шайтан',
            'english' => 'Crazy / Wild',
            'russian' => 'Сумасшедший / Дикий',
            'explanation_en' => 'An edgy or daring expression used to describe something extreme or outrageous',
            'explanation_kk' => 'Экстремалды немесе қарсылықты нәрсені сипаттау үшін қолданылатын ретінде айтылады',
            'explanation_ru' => 'Выражение, используемое для описания чего-то экстремального или возмутительного',
            'example_sentence_kk' => 'Шайтан барлық түнеу өндіктелді!',
            'example_sentence_en' => 'That party was absolutely wild!',
            'example_sentence_ru' => 'Та вечеринка была просто бешеная!',
            'context_en' => 'Among party-goers and younger crowds',
            'context_kk' => 'Той-ойын ішінде және жас адамдар арасында',
            'context_ru' => 'Среди вечеринок и молодежи'
        ]
    ];

    $stmt = $db->prepare('
        INSERT IGNORE INTO slang 
        (kazakh, english, russian, explanation_en, explanation_kk, explanation_ru,
         example_sentence_kk, example_sentence_en, example_sentence_ru,
         context_en, context_kk, context_ru)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');

    foreach ($sampleSlang as $slang) {
        $stmt->execute([
            $slang['kazakh'],
            $slang['english'],
            $slang['russian'],
            $slang['explanation_en'],
            $slang['explanation_kk'],
            $slang['explanation_ru'],
            $slang['example_sentence_kk'],
            $slang['example_sentence_en'],
            $slang['example_sentence_ru'],
            $slang['context_en'],
            $slang['context_kk'],
            $slang['context_ru']
        ]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Migration completed successfully. Slang tables and sample data created.'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}
