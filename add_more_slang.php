<?php
// Add more random slang to database
require_once __DIR__ . '/includes/config.php';

$db = getDB();

$moreSlang = [
    [
        'kazakh' => 'Сүмме',
        'english' => 'Money / Bucks',
        'russian' => 'Деньги / Баксы',
        'explanation_en' => 'Slang term for money, commonly used among youth',
        'explanation_kk' => 'Жастарда қолданылатын ақша үшін сленгтік термин',
        'explanation_ru' => 'Сленговый термин для денег, используемый молодежью',
        'example_sentence_kk' => 'Менде сүмме жоқ болды',
        'example_sentence_en' => 'I ran out of money',
        'example_sentence_ru' => 'Я истратил деньги',
        'context_en' => 'Among friends, casual conversation',
        'context_kk' => 'Достарының арасында',
        'context_ru' => 'Среди друзей'
    ],
    [
        'kazakh' => 'Тәлім',
        'english' => 'Vibe / Mood',
        'russian' => 'Атмосфера / Настроение',
        'explanation_en' => 'Describes the feeling or atmosphere',
        'explanation_kk' => 'Атмосфера немесе сезімді сипаттайды',
        'explanation_ru' => 'Описывает атмосферу или ощущение',
        'example_sentence_kk' => 'Бұл жерде жақсы тәлім бар',
        'example_sentence_en' => 'Good vibes here',
        'example_sentence_ru' => 'Здесь хорошая атмосфера',
        'context_en' => 'At parties or gatherings',
        'context_kk' => 'Той-ойындарда',
        'context_ru' => 'На вечеринках'
    ],
    [
        'kazakh' => 'Ақ түлік',
        'english' => 'That\'s crazy!',
        'russian' => 'Это сумасшествие!',
        'explanation_en' => 'Expression of shock or disbelief',
        'explanation_kk' => 'Таңырану немесе сенімсіздік білдіру',
        'explanation_ru' => 'Выражение удивления или недоверия',
        'example_sentence_kk' => 'Ақ түлік! Ол нағыз ойнады!',
        'example_sentence_en' => 'That\'s crazy! He actually did it!',
        'example_sentence_ru' => 'Это сумасшествие! Он действительно это сделал!',
        'context_en' => 'When reacting to unexpected news',
        'context_kk' => 'Күтпеген жаңалықта',
        'context_ru' => 'При неожиданных новостях'
    ],
    [
        'kazakh' => 'Жомарт',
        'english' => 'Generous / Cool person',
        'russian' => 'Щедрый / Крутой человек',
        'explanation_en' => 'Someone who is generous or open-minded',
        'explanation_kk' => 'Ба жомарт немесе ашық пікірлі адам',
        'explanation_ru' => 'Щедрый или открытый человек',
        'example_sentence_kk' => 'Ол өте жомарт адам',
        'example_sentence_en' => 'He\'s a very generous person',
        'example_sentence_ru' => 'Он очень щедрый человек',
        'context_en' => 'Describing people',
        'context_kk' => 'Адамдарды сипаттау',
        'context_ru' => 'При описании людей'
    ],
    [
        'kazakh' => 'Басқара',
        'english' => 'In control / Managing',
        'russian' => 'Управлять / Контролировать',
        'explanation_en' => 'To be in control of a situation',
        'explanation_kk' => 'Жағдайды бақылау астында ұстау',
        'explanation_ru' => 'Контролировать ситуацию',
        'example_sentence_kk' => 'Ол өте жақсы басқара алады',
        'example_sentence_en' => 'He can manage things well',
        'example_sentence_ru' => 'Он хорошо справляется',
        'context_en' => 'Work or organizational context',
        'context_kk' => 'Жұмыс контекстінде',
        'context_ru' => 'В рабочем контексте'
    ],
    [
        'kazakh' => 'Қылмыс',
        'english' => 'That\'s unfair!',
        'russian' => 'Это несправедливо!',
        'explanation_en' => 'Expression of something being unjust',
        'explanation_kk' => 'Адал еместігін білдіру',
        'explanation_ru' => 'Выражение несправедливости',
        'example_sentence_kk' => 'Қылмыс! Ол нұсқасын беруге болмайды!',
        'example_sentence_en' => 'That\'s unfair! He shouldn\'t have done that!',
        'example_sentence_ru' => 'Это несправедливо! Он не должен был этого делать!',
        'context_en' => 'When complaining about injustice',
        'context_kk' => 'Беріктілік туралы айтқанда',
        'context_ru' => 'При жалобе на несправедливость'
    ],
    [
        'kazakh' => 'Ісік болмас',
        'english' => 'No problem / No worries',
        'russian' => 'Без проблем / Без забот',
        'explanation_en' => 'Casual way to say it\'s okay or no problem',
        'explanation_kk' => 'Ештеме жоқ деген сөз',
        'explanation_ru' => 'Ничего страшного',
        'example_sentence_kk' => 'Ісік болмас, келесі сәтте істей аламыз',
        'example_sentence_en' => 'No problem, we can do it next time',
        'example_sentence_ru' => 'Без проблем, сделаем в следующий раз',
        'context_en' => 'Casual reassurance',
        'context_kk' => 'Түспіндіру үшін',
        'context_ru' => 'При успокоении'
    ],
    [
        'kazakh' => 'Құлақ салу',
        'english' => 'Listen up / Pay attention',
        'russian' => 'Слушай внимательно',
        'explanation_en' => 'To pay close attention to something',
        'explanation_kk' => 'Бір нәрсеге зейін бөлу',
        'explanation_ru' => 'Обратить пристальное внимание',
        'example_sentence_kk' => 'Құлақ сал, маған екі сөз айтқысы келеді!',
        'example_sentence_en' => 'Listen up, I have something to tell you!',
        'example_sentence_ru' => 'Слушай внимательно, я должен вам кое-что сказать!',
        'context_en' => 'When you want to share important info',
        'context_kk' => 'Маңызды ақпарат берерінде',
        'context_ru' => 'Когда нужно поделиться важной информацией'
    ],
    [
        'kazakh' => 'Төөрі',
        'english' => 'Cool / Awesome',
        'russian' => 'Классный / Потрясающий',
        'explanation_en' => 'Alternative slang for something amazing',
        'explanation_kk' => 'Ажарлы нәрсе үшін өзге сленг',
        'explanation_ru' => 'Альтернативный сленг для чего-то потрясающего',
        'example_sentence_kk' => 'Сіңді жаңа машинасы төөрі!',
        'example_sentence_en' => 'Your new car is awesome!',
        'example_sentence_ru' => 'Твоя новая машина классная!',
        'context_en' => 'Complimenting things',
        'context_kk' => 'Нәрселерді мақтау',
        'context_ru' => 'При похвале вещей'
    ],
    [
        'казakh' => 'Ат сез',
        'english' => 'Stop it / Cut it out',
        'russian' => 'Прекратить / Остановитесь',
        'explanation_en' => 'Tell someone to stop doing something',
        'explanation_kk' => 'Біреуге нәрсе істеуді тоқтатуды айту',
        'explanation_ru' => 'Сказать кому-то прекратить что-то',
        'example_sentence_kk' => 'Ат сез! Оны істеме!',
        'example_sentence_en' => 'Cut it out! Don\'t do that!',
        'example_sentence_ru' => 'Прекратить! Не делай этого!',
        'context_en' => 'When asking someone to stop',
        'context_kk' => 'Бірді тоқтатуды сұрау',
        'context_ru' => 'Когда просите кого-то прекратить'
    ],
    [
        'kazakh' => 'Деген де',
        'english' => 'Even so / Anyway',
        'russian' => 'Все равно / В любом случае',
        'explanation_en' => 'Used to continue despite previous statement',
        'explanation_kk' => 'Алдыңғы айтқанға қарамастан жалғастыру',
        'explanation_ru' => 'Продолжить несмотря на предыдущее заявление',
        'example_sentence_kk' => 'Қолайсыз болсада, деген де бар сөзім бар',
        'example_sentence_en' => 'Even if it\'s inconvenient, I still have something to say',
        'example_sentence_ru' => 'Даже если неудобно, у меня есть что сказать',
        'context_en' => 'Expressing determination',
        'context_kk' => 'Ішенділіктіліктен',
        'context_ru' => 'При выражении решимости'
    ],
    [
        'kazakh' => 'Байқап рахым',
        'english' => 'Be careful / Watch out',
        'russian' => 'Будь осторожен / Смотри',
        'explanation_en' => 'Warning someone to be careful',
        'explanation_kk' => 'Бірді сақ болуға ескерту',
        'explanation_ru' => 'Предупреждение быть осторожным',
        'example_sentence_kk' => 'Байқап рахым! Машина келе жатыр!',
        'example_sentence_en' => 'Watch out! A car is coming!',
        'example_sentence_ru' => 'Смотри! Едет машина!',
        'context_en' => 'Warning of danger',
        'context_kk' => 'Қауіп туралы',
        'context_ru' => 'При предупреждении об опасности'
    ],
    [
        'kazakh' => 'Сосын не?',
        'english' => 'So what? / And then?',
        'russian' => 'И что? / И тогда?',
        'explanation_en' => 'Questioning what comes next or expressing indifference',
        'explanation_kk' => 'Келесі не екенін сұраңыз немесе түсінік аймасын өтінеңіз',
        'explanation_ru' => 'Вопрос о том, что дальше или выражение равнодушия',
        'example_sentence_kk' => 'Ол сынақты сынады. - Сосын не?',
        'example_sentence_en' => 'He failed the test. - So what?',
        'example_sentence_ru' => 'Он завалил тест. - И что?',
        'context_en' => 'Challenging or dismissive tone',
        'context_kk' => 'Сынамалау немесе сапасы жоқ түссі',
        'context_ru' => 'Вызывающий или пренебрежительный тон'
    ]
];

$stmt = $db->prepare('
    INSERT IGNORE INTO slang 
    (kazakh, english, russian, explanation_en, explanation_kk, explanation_ru,
     example_sentence_kk, example_sentence_en, example_sentence_ru,
     context_en, context_kk, context_ru)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');

foreach ($moreSlang as $slang) {
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
    'message' => 'Added ' . count($moreSlang) . ' more slang entries'
]);
