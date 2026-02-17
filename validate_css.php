<?php
$file = 'styles.css';
$content = file_get_contents($file);
$lines = explode("\n", $content);

$stack = [];
$errors = [];

foreach ($lines as $i => $line) {
    $lineNum = $i + 1;
    for ($j = 0; $j < strlen($line); $j++) {
        $char = $line[$j];
        if ($char === '{') {
            $stack[] = $lineNum;
        } elseif ($char === '}') {
            if (empty($stack)) {
                $errors[] = "Line $lineNum: Unexpected closing brace '}'";
            } else {
                array_pop($stack);
            }
        }
    }
}

if (!empty($stack)) {
    foreach ($stack as $ln) {
        $errors[] = "Line $ln: Unclosed opening brace '{'";
    }
}

if (!empty($errors)) {
    echo "CSS Validation Errors:\n";
    foreach ($errors as $e) {
        echo "$e\n";
    }
} else {
    echo "CSS Braces are balanced.\n";
}
