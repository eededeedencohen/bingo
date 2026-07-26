/**
 * questions.js — the summer question bank.
 *
 * Each entry is one question with ONE unambiguous answer, in Hebrew and English.
 * A card cell stores the entry's `id`; the client renders `he.a` or `en.a`
 * depending on the player's language, so a single dealt card serves both.
 *
 * RULES FOR ADDING ENTRIES — the game breaks quietly if these are violated:
 *   1. Exactly one defensible answer. A question a player could answer correctly
 *      in two ways will reject their bingo through no fault of their own.
 *   2. `id` must be unique, and no two entries may share an answer in EITHER
 *      language — one cell must satisfy exactly one question.
 *   3. Answers stay short (<= ~12 Hebrew characters) so they fit a card cell on
 *      a phone screen.
 *   4. Keep at least 24 entries (ANSWERS_PER_CARD). More variety means fewer
 *      players holding near-identical cards.
 */
export const QUESTIONS = [
  {
    "id": "sand",
    "theme": "sea",
    "he": {
      "q": "מה החומר הצהוב והרך שמכסה את כל חוף הים?",
      "a": "חול"
    },
    "en": {
      "q": "What is the soft yellow stuff that covers the whole beach?",
      "a": "Sand"
    }
  },
  {
    "id": "wave",
    "theme": "sea",
    "he": {
      "q": "איך קוראים למים שמתרוממים בים ומשתברים על החוף עם קצף?",
      "a": "גל"
    },
    "en": {
      "q": "What do you call the water that rises up in the sea and breaks on the shore with foam?",
      "a": "Wave"
    }
  },
  {
    "id": "shell",
    "theme": "sea",
    "he": {
      "q": "איך קוראים לבית הקשה של חיית ים שילדים מוצאים בחול ואוספים?",
      "a": "צדף"
    },
    "en": {
      "q": "What do you call the hard little case of a sea creature that kids find in the sand and collect?",
      "a": "Shell"
    }
  },
  {
    "id": "towel",
    "theme": "sea",
    "he": {
      "q": "במה מתנגבים כשיוצאים רטובים מהמים?",
      "a": "מגבת"
    },
    "en": {
      "q": "What do you dry yourself with when you come out of the water all wet?",
      "a": "Towel"
    }
  },
  {
    "id": "swimsuit",
    "theme": "sea",
    "he": {
      "q": "איזה בגד לובשים כדי להיכנס למים?",
      "a": "בגד ים"
    },
    "en": {
      "q": "Which piece of clothing do you put on in order to get into the water?",
      "a": "Swimsuit"
    }
  },
  {
    "id": "bucket",
    "theme": "sea",
    "he": {
      "q": "במה ממלאים חול ומים בחוף כדי לבנות מגדל?",
      "a": "דלי"
    },
    "en": {
      "q": "What do you fill with sand and water at the beach to build a tower?",
      "a": "Bucket"
    }
  },
  {
    "id": "lifeguard",
    "theme": "sea",
    "he": {
      "q": "מי יושב במגדל בחוף ושורק לשוחים שמתרחקים מדי?",
      "a": "מציל"
    },
    "en": {
      "q": "Who sits in the tower at the beach and whistles at swimmers who go too far out?",
      "a": "Lifeguard"
    }
  },
  {
    "id": "jellyfish",
    "theme": "sea",
    "he": {
      "q": "איזו חיה שקופה בים עוקצת את המתרחצים בקיץ?",
      "a": "מדוזה"
    },
    "en": {
      "q": "Which see-through sea creature stings the swimmers in the summer?",
      "a": "Jellyfish"
    }
  },
  {
    "id": "octopus",
    "theme": "sea",
    "he": {
      "q": "לאיזו חיה בים יש שמונה זרועות?",
      "a": "תמנון"
    },
    "en": {
      "q": "Which sea animal has eight arms?",
      "a": "Octopus"
    }
  },
  {
    "id": "crab",
    "theme": "sea",
    "he": {
      "q": "איזו חיה קטנה בחוף הולכת הצידה ויש לה צבתות?",
      "a": "סרטן"
    },
    "en": {
      "q": "Which little beach animal walks sideways and has two claws?",
      "a": "Crab"
    }
  },
  {
    "id": "shark",
    "theme": "sea",
    "he": {
      "q": "איזה דג גדול ומפחיד שוחה בים עם סנפיר משולש והמון שיניים חדות?",
      "a": "כריש"
    },
    "en": {
      "q": "Which big scary fish swims in the sea with a triangular fin and lots of sharp teeth?",
      "a": "Shark"
    }
  },
  {
    "id": "boat",
    "theme": "sea",
    "he": {
      "q": "איך קוראים לכלי הקטן ששטים בו על המים וחותרים עם משוטים?",
      "a": "סירה"
    },
    "en": {
      "q": "What do you call the small thing you float on the water in and row with oars?",
      "a": "Boat"
    }
  },
  {
    "id": "sun",
    "theme": "sun",
    "he": {
      "q": "מה הכדור הצהוב הגדול שמאיר ומחמם אותנו ביום?",
      "a": "שמש"
    },
    "en": {
      "q": "What is the big yellow ball that lights us up and warms us during the day?",
      "a": "Sun"
    }
  },
  {
    "id": "sunscreen",
    "theme": "sun",
    "he": {
      "q": "מה מורחים על העור בחוף כדי לא להישרף?",
      "a": "קרם הגנה"
    },
    "en": {
      "q": "What do you rub on your skin at the beach so you don't get burned?",
      "a": "Sunscreen"
    }
  },
  {
    "id": "hat",
    "theme": "sun",
    "he": {
      "q": "מה שמים על הראש כדי להגן עליו מהשמש?",
      "a": "כובע"
    },
    "en": {
      "q": "What do you put on your head to protect it from the sun?",
      "a": "Hat"
    }
  },
  {
    "id": "shade",
    "theme": "sun",
    "he": {
      "q": "איך קוראים למקום הקריר והכהה שמתחת לעץ ביום חם?",
      "a": "צל"
    },
    "en": {
      "q": "What do you call the cool dark spot under a tree on a hot day?",
      "a": "Shade"
    }
  },
  {
    "id": "sweat",
    "theme": "sun",
    "he": {
      "q": "איך קוראים לטיפות המלוחות שנוזלות על העור כשחם מאוד?",
      "a": "זיעה"
    },
    "en": {
      "q": "What do you call the salty drops that run down your skin when it's very hot?",
      "a": "Sweat"
    }
  },
  {
    "id": "sky",
    "theme": "sun",
    "he": {
      "q": "איך קוראים לכחול הענק שמעל הראש שלנו?",
      "a": "שמיים"
    },
    "en": {
      "q": "What do you call the huge blue thing above our heads?",
      "a": "Sky"
    }
  },
  {
    "id": "air-conditioner",
    "theme": "sun",
    "he": {
      "q": "איזה מכשיר תלוי גבוה על הקיר בבית ומקרר את כל החדר?",
      "a": "מזגן"
    },
    "en": {
      "q": "Which machine hangs high on the wall at home and cools the whole room?",
      "a": "Air conditioner"
    }
  },
  {
    "id": "fan",
    "theme": "sun",
    "he": {
      "q": "איזה מכשיר מסתובב ומנשב עלינו אוויר כשחם?",
      "a": "מאוורר"
    },
    "en": {
      "q": "Which machine spins around and blows air at us when it's hot?",
      "a": "Fan"
    }
  },
  {
    "id": "ice-cubes",
    "theme": "sun",
    "he": {
      "q": "מה שמים בתוך הכוס כדי שהמשקה יהיה קר?",
      "a": "קרח"
    },
    "en": {
      "q": "What do you put in a glass to make the drink cold?",
      "a": "Ice cubes"
    }
  },
  {
    "id": "wind",
    "theme": "sun",
    "he": {
      "q": "איך קוראים לאוויר שנושב בחוץ ומזיז את העלים בעצים?",
      "a": "רוח"
    },
    "en": {
      "q": "What do you call the air that blows outside and moves the leaves on the trees?",
      "a": "Wind"
    }
  },
  {
    "id": "watermelon",
    "theme": "food",
    "he": {
      "q": "איזה פרי קיץ ירוק מבחוץ, אדום מבפנים ומלא גרעינים שחורים?",
      "a": "אבטיח"
    },
    "en": {
      "q": "Which summer fruit is green outside, red inside, and full of black seeds?",
      "a": "Watermelon"
    }
  },
  {
    "id": "melon",
    "theme": "food",
    "he": {
      "q": "איזה פרי קיץ עגול, ירקרק מבחוץ וכתום ומתוק מבפנים?",
      "a": "מלון"
    },
    "en": {
      "q": "Which round summer fruit is greenish outside and orange and sweet inside?",
      "a": "Melon"
    }
  },
  {
    "id": "mango",
    "theme": "food",
    "he": {
      "q": "איזה פרי קיץ כתום ומתוק גדל על עץ ויש לו גלעין גדול ושטוח?",
      "a": "מנגו"
    },
    "en": {
      "q": "Which sweet orange summer fruit grows on a tree and has one big flat pit?",
      "a": "Mango"
    }
  },
  {
    "id": "grapes",
    "theme": "food",
    "he": {
      "q": "איזה פרי קיץ קטן ועגול גדל באשכולות על הגפן?",
      "a": "ענבים"
    },
    "en": {
      "q": "Which small round summer fruit grows in bunches on a vine?",
      "a": "Grapes"
    }
  },
  {
    "id": "corn",
    "theme": "food",
    "he": {
      "q": "איזה ירק צהוב על קלח מוכרים חם בחוף הים?",
      "a": "תירס"
    },
    "en": {
      "q": "Which yellow vegetable on a cob is sold hot at the beach?",
      "a": "Corn"
    }
  },
  {
    "id": "ice-cream",
    "theme": "food",
    "he": {
      "q": "איזה קינוח קר ומתוק מלקקים מגביע ביום חם?",
      "a": "גלידה"
    },
    "en": {
      "q": "Which cold sweet treat do you lick out of a cone on a hot day?",
      "a": "Ice cream"
    }
  },
  {
    "id": "popsicle",
    "theme": "food",
    "he": {
      "q": "איזה ממתק קפוא ממיץ אוכלים על מקל בקיץ?",
      "a": "ארטיק"
    },
    "en": {
      "q": "Which frozen juice treat do you eat off a stick in the summer?",
      "a": "Popsicle"
    }
  },
  {
    "id": "slushy",
    "theme": "food",
    "he": {
      "q": "איך קוראים למשקה הקפוא שנראה כמו שלג צבעוני ושותים אותו בקשית?",
      "a": "ברד"
    },
    "en": {
      "q": "What do you call the frozen drink that looks like colored snow and is sipped through a straw?",
      "a": "Slushy"
    }
  },
  {
    "id": "lemonade",
    "theme": "food",
    "he": {
      "q": "איזה משקה קר מכינים מלימונים, מים וסוכר?",
      "a": "לימונדה"
    },
    "en": {
      "q": "Which cold drink is made from lemons, water and sugar?",
      "a": "Lemonade"
    }
  },
  {
    "id": "water",
    "theme": "food",
    "he": {
      "q": "מה הכי חשוב לשתות הרבה ביום חם מאוד?",
      "a": "מים"
    },
    "en": {
      "q": "What is the most important thing to drink a lot of on a boiling hot day?",
      "a": "Water"
    }
  },
  {
    "id": "pool",
    "theme": "fun",
    "he": {
      "q": "לאן הולכים לשחות בקיץ כשלא הולכים לים?",
      "a": "בריכה"
    },
    "en": {
      "q": "Where do you go swimming in the summer when you don't go to the sea?",
      "a": "Pool"
    }
  },
  {
    "id": "summer-camp",
    "theme": "fun",
    "he": {
      "q": "לאן שולחים ילדים בקיץ כדי לשחק ולעשות פעילויות עם מדריכים כל היום?",
      "a": "קייטנה"
    },
    "en": {
      "q": "Where do kids go in the summer to play and do activities with counselors all day?",
      "a": "Summer camp"
    }
  },
  {
    "id": "summer-vacation",
    "theme": "fun",
    "he": {
      "q": "איך קוראים לתקופה הארוכה בקיץ שבה אין בית ספר?",
      "a": "חופש גדול"
    },
    "en": {
      "q": "What do you call the long break in the summer when there is no school?",
      "a": "Summer vacation"
    }
  },
  {
    "id": "bicycle",
    "theme": "fun",
    "he": {
      "q": "על מה רוכבים בשכונה בחופש, כשיש שני גלגלים ודוושות?",
      "a": "אופניים"
    },
    "en": {
      "q": "What do you ride around the neighborhood on vacation that has two wheels and pedals?",
      "a": "Bicycle"
    }
  },
  {
    "id": "flip-flops",
    "theme": "fun",
    "he": {
      "q": "מה נועלים בקיץ, עם רצועה שנכנסת בין אצבעות הרגל?",
      "a": "כפכפים"
    },
    "en": {
      "q": "Which summer footwear has a strap that goes between your toes?",
      "a": "Flip-flops"
    }
  },
  {
    "id": "kite",
    "theme": "fun",
    "he": {
      "q": "מה מעיפים גבוה באוויר ומחזיקים בחוט?",
      "a": "עפיפון"
    },
    "en": {
      "q": "What do you fly high up in the air while holding a string?",
      "a": "Kite"
    }
  },
  {
    "id": "sprinkler",
    "theme": "fun",
    "he": {
      "q": "איזה מכשיר בגינה מסתובב ומתיז מים על הדשא?",
      "a": "ממטרה"
    },
    "en": {
      "q": "Which garden gadget spins around and sprays water on the grass?",
      "a": "Sprinkler"
    }
  },
  {
    "id": "tent",
    "theme": "fun",
    "he": {
      "q": "איך קוראים לבית הקטן מבד שמקימים בקמפינג וישנים בתוכו?",
      "a": "אוהל"
    },
    "en": {
      "q": "What do you call the little cloth house you put up when camping and sleep inside?",
      "a": "Tent"
    }
  },
  {
    "id": "campfire",
    "theme": "fun",
    "he": {
      "q": "איך קוראים לאש הגדולה שמדליקים מענפים בערב ויושבים סביבה?",
      "a": "מדורה"
    },
    "en": {
      "q": "What do you call the big fire you light from branches in the evening and sit around?",
      "a": "Campfire"
    }
  },
  {
    "id": "stars",
    "theme": "fun",
    "he": {
      "q": "אילו נקודות קטנות מנצנצות מעל הראש בלילות הקיץ?",
      "a": "כוכבים"
    },
    "en": {
      "q": "Which tiny dots twinkle above our heads on summer nights?",
      "a": "Stars"
    }
  },
  {
    "id": "mosquito",
    "theme": "nature",
    "he": {
      "q": "איזה חרק קטן מזמזם לך באוזן בלילה ומשאיר עקיצה שמגרדת?",
      "a": "יתוש"
    },
    "en": {
      "q": "Which tiny insect buzzes in your ear at night and leaves an itchy bite?",
      "a": "Mosquito"
    }
  },
  {
    "id": "cricket",
    "theme": "nature",
    "he": {
      "q": "איזה חרק קטן עושה 'צר צר צר' בחצר בערב?",
      "a": "צרצר"
    },
    "en": {
      "q": "Which little insect goes 'chirp chirp chirp' in the yard in the evening?",
      "a": "Cricket"
    }
  },
  {
    "id": "butterfly",
    "theme": "nature",
    "he": {
      "q": "איזה חרק צבעוני עם כנפיים גדולות מתעופף בין הפרחים?",
      "a": "פרפר"
    },
    "en": {
      "q": "Which colorful insect with big wings flutters between the flowers?",
      "a": "Butterfly"
    }
  },
  {
    "id": "sunflower",
    "theme": "nature",
    "he": {
      "q": "איזה פרח צהוב וענק גדל גבוה בשדה, ובתוכו גרעינים?",
      "a": "חמנייה"
    },
    "en": {
      "q": "Which giant yellow flower grows tall in the field with seeds inside it?",
      "a": "Sunflower"
    }
  }
];
