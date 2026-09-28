import random


QUESTION_TEMPLATES = {
    "python": [
        {
            "question_type": "mcq",
            "question": "Which data type is used to store an ordered collection of values in Python?",
            "option_a": "List",
            "option_b": "Set",
            "option_c": "Dictionary",
            "option_d": "Boolean",
            "correct_answer": ["A"],
            "explanation": "A Python list stores an ordered collection of values.",
        },
        {
            "question_type": "mcq",
            "question": "Which keyword is used to define a function in Python?",
            "option_a": "function",
            "option_b": "def",
            "option_c": "func",
            "option_d": "define",
            "correct_answer": ["B"],
            "explanation": "Python uses the def keyword to define functions.",
        },
        {
            "question_type": "true_false",
            "question": "Python supports object-oriented programming.",
            "option_a": "True",
            "option_b": "False",
            "option_c": "",
            "option_d": "",
            "correct_answer": ["A"],
            "explanation": "Python supports object-oriented programming through classes and objects.",
        },
        {
            "question_type": "code_output",
            "question": "What is the output of this Python code?\n\nx = [1, 2, 3]\nprint(len(x))",
            "option_a": "2",
            "option_b": "3",
            "option_c": "4",
            "option_d": "Error",
            "correct_answer": ["B"],
            "explanation": "The list contains three elements, so len(x) returns 3.",
        },
    ],
    "javascript": [
        {
            "question_type": "mcq",
            "question": "Which keyword declares a block-scoped variable that can be reassigned in JavaScript?",
            "option_a": "var",
            "option_b": "let",
            "option_c": "const",
            "option_d": "static",
            "correct_answer": ["B"],
            "explanation": "let creates a block-scoped variable that can be reassigned.",
        },
        {
            "question_type": "mcq",
            "question": "Which method converts a JSON string into a JavaScript object?",
            "option_a": "JSON.parse()",
            "option_b": "JSON.stringify()",
            "option_c": "JSON.object()",
            "option_d": "JSON.convert()",
            "correct_answer": ["A"],
            "explanation": "JSON.parse() converts a JSON string into a JavaScript value.",
        },
        {
            "question_type": "true_false",
            "question": "JavaScript can be used to create interactive web interfaces.",
            "option_a": "True",
            "option_b": "False",
            "option_c": "",
            "option_d": "",
            "correct_answer": ["A"],
            "explanation": "JavaScript is widely used to add interaction and dynamic behavior to web applications.",
        },
    ],
    "django": [
        {
            "question_type": "mcq",
            "question": "Which file commonly contains URL routing configuration in a Django application?",
            "option_a": "models.py",
            "option_b": "views.py",
            "option_c": "urls.py",
            "option_d": "admin.py",
            "correct_answer": ["C"],
            "explanation": "Django URL patterns are commonly defined in urls.py.",
        },
        {
            "question_type": "mcq",
            "question": "Which Django component is primarily responsible for defining database structure?",
            "option_a": "Models",
            "option_b": "Templates",
            "option_c": "URLs",
            "option_d": "Middleware",
            "correct_answer": ["A"],
            "explanation": "Django models define application data structures and map them to database tables.",
        },
        {
            "question_type": "true_false",
            "question": "Django includes an object-relational mapper called the Django ORM.",
            "option_a": "True",
            "option_b": "False",
            "option_c": "",
            "option_d": "",
            "correct_answer": ["A"],
            "explanation": "Django provides an ORM for working with database records through Python objects.",
        },
    ],
    "sql": [
        {
            "question_type": "mcq",
            "question": "Which SQL statement is used to retrieve data from a database table?",
            "option_a": "GET",
            "option_b": "SELECT",
            "option_c": "FETCH",
            "option_d": "READ",
            "correct_answer": ["B"],
            "explanation": "SELECT is used to retrieve records from database tables.",
        },
        {
            "question_type": "mcq",
            "question": "Which SQL clause is used to filter rows?",
            "option_a": "ORDER BY",
            "option_b": "GROUP BY",
            "option_c": "WHERE",
            "option_d": "SORT BY",
            "correct_answer": ["C"],
            "explanation": "The WHERE clause filters rows according to a condition.",
        },
    ],
    "react": [
        {
            "question_type": "mcq",
            "question": "Which React feature is commonly used to store local component state?",
            "option_a": "useState",
            "option_b": "useRoute",
            "option_c": "usePage",
            "option_d": "useComponent",
            "correct_answer": ["A"],
            "explanation": "The useState hook is used to create and update local component state.",
        },
        {
            "question_type": "mcq",
            "question": "What is JSX primarily used for in React?",
            "option_a": "Writing SQL queries",
            "option_b": "Describing UI structure",
            "option_c": "Creating database tables",
            "option_d": "Configuring servers",
            "correct_answer": ["B"],
            "explanation": "JSX allows developers to describe UI structure using JavaScript syntax.",
        },
    ],
    "git": [
        {
            "question_type": "mcq",
            "question": "Which Git command creates a commit from staged changes?",
            "option_a": "git push",
            "option_b": "git commit",
            "option_c": "git save",
            "option_d": "git stage",
            "correct_answer": ["B"],
            "explanation": "git commit records staged changes in the repository history.",
        },
        {
            "question_type": "mcq",
            "question": "Which Git command downloads changes from a remote repository and integrates them?",
            "option_a": "git pull",
            "option_b": "git upload",
            "option_c": "git download",
            "option_d": "git clone",
            "correct_answer": ["A"],
            "explanation": "git pull fetches remote changes and integrates them into the current branch.",
        },
    ],
}


ALIASES = {
    "python": "python",
    "python programming": "python",
    "javascript": "javascript",
    "js": "javascript",
    "javascript programming": "javascript",
    "django": "django",
    "django framework": "django",
    "sql": "sql",
    "structured query language": "sql",
    "react": "react",
    "react js": "react",
    "react.js": "react",
    "git": "git",
    "git version control": "git",
    "version control": "git",
}


def normalize_skill_name(skill_name):
    return (
        str(skill_name or "")
        .strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )


def get_skill_key(skill_name):
    normalized = normalize_skill_name(skill_name)
    return ALIASES.get(normalized)


def _copy_question(question):
    return {
        "question_type": question["question_type"],
        "question": question["question"],
        "option_a": question.get("option_a", ""),
        "option_b": question.get("option_b", ""),
        "option_c": question.get("option_c", ""),
        "option_d": question.get("option_d", ""),
        "correct_answer": list(question.get("correct_answer", [])),
        "explanation": question.get("explanation", ""),
    }


def generate_generic_questions(skill_name, count=5):
    skill_name = str(skill_name).strip()

    templates = [
        {
            "question_type": "mcq",
            "question": (
                f"What is an important purpose of {skill_name} "
                "in software development?"
            ),
            "option_a": "Applying relevant concepts to solve problems",
            "option_b": "Removing the need for testing",
            "option_c": "Eliminating all databases",
            "option_d": "Replacing every programming language",
            "correct_answer": ["A"],
            "explanation": (
                f"{skill_name} is used to apply relevant concepts "
                "and techniques to solve development problems."
            ),
        },
        {
            "question_type": "true_false",
            "question": (
                f"Understanding the fundamental concepts of {skill_name} "
                "is useful before applying advanced techniques."
            ),
            "option_a": "True",
            "option_b": "False",
            "option_c": "",
            "option_d": "",
            "correct_answer": ["A"],
            "explanation": (
                "Fundamental concepts provide a foundation for "
                "understanding more advanced techniques."
            ),
        },
    ]

    if count <= len(templates):
        return [
            _copy_question(question)
            for question in templates[:count]
        ]

    # Do not blindly repeat the same questions.
    # Generate distinct wording for additional fallback questions.
    questions = [
        _copy_question(question)
        for question in templates
    ]

    for index in range(len(templates), count):
        questions.append(
            {
                "question_type": "mcq",
                "question": (
                    f"Which approach is generally useful when learning "
                    f"{skill_name}?"
                ),
                "option_a": "Practice concepts through relevant examples",
                "option_b": "Avoid all practical exercises",
                "option_c": "Ignore the fundamentals",
                "option_d": "Avoid reviewing mistakes",
                "correct_answer": ["A"],
                "explanation": (
                    f"Practical examples help reinforce concepts related "
                    f"to {skill_name}."
                ),
            }
        )

    return questions[:count]


def generate_questions(skill_name, count=5):
    if not skill_name or not str(skill_name).strip():
        raise ValueError("Skill name is required.")

    if count < 1 or count > 20:
        raise ValueError("Question count must be between 1 and 20.")

    skill_key = get_skill_key(skill_name)

    if skill_key and skill_key in QUESTION_TEMPLATES:
        available = QUESTION_TEMPLATES[skill_key]

        selected_count = min(count, len(available))

        selected = random.sample(
            available,
            selected_count,
        )

        questions = [
            _copy_question(question)
            for question in selected
        ]

        if len(questions) < count:
            questions.extend(
                generate_generic_questions(
                    skill_name,
                    count - len(questions),
                )
            )

        return questions[:count]

    return generate_generic_questions(
        skill_name,
        count,
    )