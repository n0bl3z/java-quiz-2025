document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultsScreen = document.getElementById('results-screen');
    const startButton = document.getElementById('start-button');
    const nextButton = document.getElementById('next-button');
    const restartButton = document.getElementById('restart-button');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const progressBar = document.getElementById('progress-bar');
    const questionNumber = document.getElementById('question-number');
    const correctAnswers = document.getElementById('correct-answers');
    const timeLeft = document.getElementById('time-left');
    const finalScore = document.getElementById('final-score');
    const timeSpent = document.getElementById('time-spent');
    const percentage = document.getElementById('percentage');
    const circleProgress = document.getElementById('circle-progress');
    const allQuestionsToggle = document.getElementById('all-questions-toggle');
    const questionsCount = document.getElementById('questions-count');
    const questionsCountInfo = document.querySelector('.questions-count-info');

    // Quiz state
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let pointsPerQuestion = 2.5;
    let passingScore = 50;
    let selectedOptionIndex = -1;
    let startTime;
    let timerInterval;
    let totalQuestions = 40; // По умолчанию 40 вопросов
    let useAllQuestions = false; // По умолчанию используем только 40 вопросов
    let totalAvailableQuestions = 0; // Общее количество доступных вопросов

    // Add SVG gradient definition for circle progress
    const svgNS = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(svgNS, "defs");
    const linearGradient = document.createElementNS(svgNS, "linearGradient");
    linearGradient.setAttribute("id", "gradient");
    linearGradient.setAttribute("x1", "0%");
    linearGradient.setAttribute("y1", "0%");
    linearGradient.setAttribute("x2", "100%");
    linearGradient.setAttribute("y2", "0%");

    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#6c63ff");

    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#00d4ff");

    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);
    defs.appendChild(linearGradient);

    document.querySelector('.circular-chart').insertBefore(defs, document.querySelector('.circle-bg'));

    // Parse the questions file
    async function fetchQuestions() {
        try {
            // Загружаем вопросы из GitHub Gist
            const gistUrl = 'https://gist.githubusercontent.com/n0bl3z/721000eb88ab2c2c1a57c578162a49a9/raw/4e3b6b002878435353944896abe7deebcec4a014/java-quest.txt';
            
            const response = await fetch(gistUrl);
            
            // Проверяем успешность запроса
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            const parsedQuestions = parseQuestions(text);
            
            // Обновляем общее количество доступных вопросов
            totalAvailableQuestions = parsedQuestions.length;
            
            // Обновляем информацию о количестве вопросов при переключении
            updateQuestionsCountDisplay();
            
            return parsedQuestions;
        } catch (error) {
            console.error('Error fetching questions:', error);
            alert('Не удалось загрузить вопросы. Пожалуйста, обновите страницу или попробуйте позже.');
            return [];
        }
    }

    // Parse the questions text file
    function parseQuestions(text) {
        const lines = text.split('\n');
        const parsedQuestions = [];
        let currentQuestion = null;
        let currentOptions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#####')) {
                // If we already have a question, save it before starting a new one
                if (currentQuestion && currentOptions.length > 0) {
                    parsedQuestions.push({
                        question: currentQuestion,
                        options: [...currentOptions],
                        correctIndex: 0 // The first option is always correct in the original file
                    });
                }
                
                // Start a new question
                currentQuestion = line.replace('#####', '').trim();
                currentOptions = [];
            } else if (line.startsWith('?????')) {
                // Add an option
                const option = line.replace('?????', '').trim();
                if (option) {
                    currentOptions.push(option);
                }
            }
        }

        // Add the last question if there is one
        if (currentQuestion && currentOptions.length > 0) {
            parsedQuestions.push({
                question: currentQuestion,
                options: [...currentOptions],
                correctIndex: 0
            });
        }

        return parsedQuestions;
    }

    // Shuffle array (Fisher-Yates algorithm with improved randomness)
    function shuffleArray(array) {
        const newArray = [...array]; // Создаем копию массива
        
        // Используем более сложный алгоритм перемешивания
        for (let i = newArray.length - 1; i > 0; i--) {
            // Используем несколько источников случайности
            const rand1 = Math.random();
            const rand2 = Math.random();
            const rand3 = Math.random();
            
            // Комбинируем случайные числа для лучшей энтропии
            const combinedRand = (rand1 + rand2 + rand3) / 3;
            
            // Получаем индекс для обмена
            const j = Math.floor(combinedRand * (i + 1));
            
            // Обмениваем элементы
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        
        return newArray;
    }

    // Принудительно распределяем правильные ответы по всем позициям
    function forceDistributeCorrectAnswers(questions) {
        // Создаем счетчик для отслеживания позиций правильных ответов
        const positionCounts = {};
        
        // Обрабатываем каждый вопрос
        return questions.map((question, questionIndex) => {
            // Получаем текущую позицию правильного ответа
            const correctIndex = question.correctIndex;
            
            // Если мы уже обработали много вопросов, начинаем балансировку
            if (questionIndex > 5) {
                // Находим наименее используемую позицию
                let leastUsedPosition = 0;
                let minCount = Number.MAX_SAFE_INTEGER;
                
                for (let i = 0; i < question.options.length; i++) {
                    const count = positionCounts[i] || 0;
                    if (count < minCount) {
                        minCount = count;
                        leastUsedPosition = i;
                    }
                }
                
                // Если текущая позиция правильного ответа сильно перевешивает, меняем её
                const currentPositionCount = positionCounts[correctIndex] || 0;
                if (currentPositionCount > minCount + 1) {
                    // Получаем правильный вариант ответа
                    const correctOption = question.options[correctIndex];
                    
                    // Получаем вариант ответа в наименее используемой позиции
                    const optionToSwap = question.options[leastUsedPosition];
                    
                    // Создаем новый массив вариантов ответа с обменом
                    const newOptions = [...question.options];
                    newOptions[correctIndex] = optionToSwap;
                    newOptions[leastUsedPosition] = correctOption;
                    
                    // Обновляем счетчик позиций
                    positionCounts[leastUsedPosition] = (positionCounts[leastUsedPosition] || 0) + 1;
                    
                    // Возвращаем обновленный вопрос
                    return {
                        ...question,
                        options: newOptions,
                        correctIndex: leastUsedPosition
                    };
                }
            }
            
            // Обновляем счетчик позиций
            positionCounts[correctIndex] = (positionCounts[correctIndex] || 0) + 1;
            
            // Возвращаем исходный вопрос
            return question;
        });
    }

    // Select random questions and shuffle options
    function prepareQuiz(allQuestions) {
        // Shuffle all questions
        const shuffledQuestions = shuffleArray([...allQuestions]);
        
        // Выбираем вопросы в зависимости от настройки пользователя
        const selectedQuestions = useAllQuestions ? 
            shuffledQuestions : // Все вопросы
            shuffledQuestions.slice(0, totalQuestions); // Только 40 вопросов
        
        // For each question, shuffle the options and track the new position of the correct answer
        let preparedQuestions = selectedQuestions.map(q => {
            const correctOption = q.options[q.correctIndex];
            const shuffledOptions = shuffleArray([...q.options]);
            const newCorrectIndex = shuffledOptions.indexOf(correctOption);
            
            return {
                question: q.question,
                options: shuffledOptions,
                correctIndex: newCorrectIndex
            };
        });
        
        // Принудительно распределяем правильные ответы равномерно
        preparedQuestions = forceDistributeCorrectAnswers(preparedQuestions);
        
        return preparedQuestions;
    }

    // Display the current question
    function displayQuestion() {
        const question = questions[currentQuestionIndex];
        questionText.textContent = question.question;
        
        // Clear previous options
        optionsContainer.innerHTML = '';
        
        // Add new options
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('option');
            optionElement.innerHTML = `<span class="option-text">${option}</span>`;
            optionElement.dataset.index = index;
            
            // Используем addEventListener вместо прямого присваивания
            optionElement.addEventListener('click', function() {
                selectOption(index);
            });
            
            optionsContainer.appendChild(optionElement);
        });
        
        // Update progress
        updateProgress();
    }

    // Select an option
    function selectOption(index) {
        // Позволяем выбирать другой вариант ответа до нажатия кнопки "Следующий вопрос"
        selectedOptionIndex = index;
        const options = optionsContainer.querySelectorAll('.option');
        
        // Убираем класс selected со всех вариантов
        options.forEach(option => option.classList.remove('selected'));
        
        // Добавляем класс selected выбранному варианту
        options[index].classList.add('selected');
        
        // Включаем кнопку "Следующий вопрос"
        nextButton.disabled = false;
    }

    // Reveal the correct answer
    function revealAnswer() {
        const question = questions[currentQuestionIndex];
        const options = optionsContainer.querySelectorAll('.option');
        
        // Mark the correct answer
        options[question.correctIndex].classList.add('correct');
        
        // If selected answer is wrong, mark it as incorrect
        if (selectedOptionIndex !== question.correctIndex && selectedOptionIndex !== -1) {
            options[selectedOptionIndex].classList.add('incorrect');
        }
        
        // Update score if correct
        if (selectedOptionIndex === question.correctIndex) {
            score++;
            correctAnswers.textContent = score;
        }
        
        // Disable the next button temporarily to prevent multiple clicks
        nextButton.disabled = true;
    }

    // Move to the next question
    function nextQuestion() {
        // Блокируем кнопку, чтобы предотвратить множественные нажатия
        nextButton.disabled = true;
        
        // Добавляем задержку перед переходом к следующему вопросу
        setTimeout(() => {
            currentQuestionIndex++;
            selectedOptionIndex = -1;
            
            if (currentQuestionIndex < questions.length) {
                // Перемешиваем варианты ответов для следующего вопроса каждый раз
                const currentQuestion = questions[currentQuestionIndex];
                const correctOption = currentQuestion.options[currentQuestion.correctIndex];
                
                // Используем улучшенный алгоритм перемешивания
                const newShuffledOptions = shuffleArray([...currentQuestion.options]);
                
                // Принудительно перемещаем правильный ответ в случайную позицию
                // с учетом предыдущих позиций для более равномерного распределения
                let newCorrectIndex;
                
                // Используем разные стратегии для разных вопросов для непредсказуемости
                if (Math.random() < 0.5) {
                    // Стратегия 1: полностью случайная позиция
                    newCorrectIndex = newShuffledOptions.indexOf(correctOption);
                } else {
                    // Стратегия 2: выбираем позицию, которая меньше использовалась
                    // Создаем массив с весами для каждой позиции (меньше вес = выше шанс)
                    const positionWeights = [0, 0, 0, 0, 0]; // Для 5 вариантов ответа
                    
                    // Анализируем предыдущие вопросы, чтобы определить веса
                    for (let i = 0; i < currentQuestionIndex; i++) {
                        if (questions[i].correctIndex < positionWeights.length) {
                            positionWeights[questions[i].correctIndex]++;
                        }
                    }
                    
                    // Находим текущую позицию правильного ответа
                    const currentCorrectIndex = newShuffledOptions.indexOf(correctOption);
                    
                    // Находим позицию с наименьшим весом (исключая текущую)
                    let minWeight = Number.MAX_SAFE_INTEGER;
                    let targetPosition = 0;
                    
                    for (let i = 0; i < positionWeights.length; i++) {
                        if (i !== currentCorrectIndex && positionWeights[i] < minWeight) {
                            minWeight = positionWeights[i];
                            targetPosition = i;
                        }
                    }
                    
                    // Меняем местами элементы для перемещения правильного ответа
                    const temp = newShuffledOptions[targetPosition];
                    newShuffledOptions[targetPosition] = correctOption;
                    newShuffledOptions[currentCorrectIndex] = temp;
                    
                    newCorrectIndex = targetPosition;
                }
                
                questions[currentQuestionIndex] = {
                    ...currentQuestion,
                    options: newShuffledOptions,
                    correctIndex: newCorrectIndex
                };
                
                displayQuestion();
            } else {
                endQuiz();
            }
        }, 500); // Задержка в 500 мс перед переходом к следующему вопросу
    }

    // Update progress indicators
    function updateProgress() {
        const progress = ((currentQuestionIndex) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        questionNumber.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
    }

    // Start the quiz
    async function startQuiz() {
        // Получаем настройку пользователя
        useAllQuestions = allQuestionsToggle.checked;
        
        // Fetch and prepare questions
        const allQuestions = await fetchQuestions();
        
        if (allQuestions.length === 0) {
            alert('Не удалось загрузить вопросы. Пожалуйста, обновите страницу или попробуйте позже.');
            return;
        }
        
        questions = prepareQuiz(allQuestions);
        
        // Обновляем общее количество вопросов
        totalQuestions = questions.length;
        
        // Обновляем проходной балл (50% от максимального)
        passingScore = Math.ceil(totalQuestions * pointsPerQuestion * 0.5);
        
        // Reset quiz state
        currentQuestionIndex = 0;
        score = 0;
        selectedOptionIndex = -1;
        correctAnswers.textContent = '0';
        
        // Start timer
        startTime = new Date();
        startTimer();
        
        // Show quiz screen
        startScreen.classList.remove('active');
        quizScreen.classList.add('active');
        
        // Display first question
        displayQuestion();
    }

    // End the quiz
    function endQuiz() {
        // Stop timer
        clearInterval(timerInterval);
        
        // Calculate time spent
        const endTime = new Date();
        const timeElapsed = Math.floor((endTime - startTime) / 1000); // in seconds
        const minutes = Math.floor(timeElapsed / 60);
        const seconds = timeElapsed % 60;
        
        // Calculate total points
        const totalPoints = score * pointsPerQuestion;
        const isPassing = totalPoints >= passingScore;
        
        // Update results
        finalScore.textContent = `${score}/${questions.length} (${totalPoints} баллов)`;
        timeSpent.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const percentageValue = Math.round((score / questions.length) * 100);
        percentage.textContent = `${percentageValue}%`;
        circleProgress.setAttribute('stroke-dasharray', `${percentageValue}, 100`);
        
        // Show pass/fail message
        const resultMessage = document.getElementById('result-message');
        if (resultMessage) {
            resultMessage.textContent = isPassing ? 'Тест пройден!' : `Тест не пройден. Необходимо набрать минимум ${passingScore} баллов.`;
            resultMessage.className = isPassing ? 'result-message success' : 'result-message failure';
        }
        
        // Show results screen
        quizScreen.classList.remove('active');
        resultsScreen.classList.add('active');
    }

    // Start the timer
    function startTimer() {
        timerInterval = setInterval(() => {
            const currentTime = new Date();
            const timeElapsed = Math.floor((currentTime - startTime) / 1000); // in seconds
            const minutes = Math.floor(timeElapsed / 60);
            const seconds = timeElapsed % 60;
            
            timeLeft.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    // Функция для обновления отображения количества вопросов
    function updateQuestionsCountDisplay() {
        const newCount = useAllQuestions ? totalAvailableQuestions : 40;
        
        // Обновляем отображение на стартовом экране
        // Добавляем класс для анимации
        questionsCountInfo.classList.add('animate');
        
        // Обновляем текст с небольшой задержкой для эффекта
        setTimeout(() => {
            questionsCount.textContent = newCount;
        }, 400);
        
        // Удаляем класс анимации после завершения
        setTimeout(() => {
            questionsCountInfo.classList.remove('animate');
        }, 800);
        
        // Обновляем отображение в верхней части экрана (где показано "Вопрос 0/40")
        // Добавляем анимацию
        questionNumber.classList.add('animate');
        
        // Обновляем текст с небольшой задержкой для эффекта
        setTimeout(() => {
            questionNumber.textContent = `0/${newCount}`;
        }, 400);
        
        // Удаляем класс анимации после завершения
        setTimeout(() => {
            questionNumber.classList.remove('animate');
        }, 800);
    }

    // Event listeners
    startButton.addEventListener('click', startQuiz);
    
    nextButton.addEventListener('click', () => {
        // Блокируем кнопку сразу после нажатия
        nextButton.disabled = true;
        
        revealAnswer();
        
        // Wait a moment before moving to the next question
        setTimeout(() => {
            nextQuestion();
        }, 1500);
    });
    
    restartButton.addEventListener('click', () => {
        resultsScreen.classList.remove('active');
        startScreen.classList.add('active');
    });
    
    // Обработчик переключения режима вопросов
    allQuestionsToggle.addEventListener('change', function() {
        useAllQuestions = this.checked;
        updateQuestionsCountDisplay();
    });
    
    // Инициализация: загружаем вопросы для получения общего количества
    fetchQuestions();

    // Add animation to elements when they appear
    const elementsToAnimate = document.querySelectorAll('.screen, .option, .neo-button');
    elementsToAnimate.forEach(element => {
        element.classList.add('fade-in');
    });
});
