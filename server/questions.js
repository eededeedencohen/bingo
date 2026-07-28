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
      "q": "איזה חומר זהוב מכסה את כל חוף הים, נדבק לנו לרגליים וילדים אוהבים לבנות ממנו ארמונות?",
      "a": "חול"
    },
    "en": {
      "q": "Which golden stuff covers the whole beach, sticks to our feet, and kids love building castles out of it?",
      "a": "Sand"
    }
  },
  {
    "id": "wave",
    "theme": "sea",
    "he": {
      "q": "איך קוראים לקיר המים שנשבר אל החוף בים, ואפשר לגלוש עליו עם גלשן?",
      "a": "גל"
    },
    "en": {
      "q": "What do you call the wall of water that breaks onto the shore, the one you can ride on a surfboard?",
      "a": "Wave"
    }
  },
  {
    "id": "shell",
    "theme": "sea",
    "he": {
      "q": "איזו קונכייה קטנה וקשה שפעם הייתה בית של חיית ים, אנחנו אוהבים לאסוף למזכרת על החוף?",
      "a": "צדף"
    },
    "en": {
      "q": "Which small hard case that was once a sea creature's home do we love collecting on the beach as a keepsake?",
      "a": "Shell"
    }
  },
  {
    "id": "towel",
    "theme": "sea",
    "he": {
      "q": "על איזה פריט רך וסופג אנחנו שוכבים להשתזף, ומשתמשים בו כדי להתייבש כשיוצאים מהמים?",
      "a": "מגבת"
    },
    "en": {
      "q": "Which soft absorbent item do we lie on to sunbathe, and use to dry off when we come out of the water?",
      "a": "Towel"
    }
  },
  {
    "id": "swimsuit",
    "theme": "sea",
    "he": {
      "q": "איזה פריט לבוש עשוי מבד שמתייבש מהר, והוא חובה לכל קפיצה לבריכה או לים?",
      "a": "בגד ים"
    },
    "en": {
      "q": "Which piece of clothing is made of quick-drying fabric and is a must for any jump into the pool or the sea?",
      "a": "Swimsuit"
    }
  },
  {
    "id": "bucket",
    "theme": "sea",
    "he": {
      "q": "באיזה כלי פלסטיק פשוט נעזרים בחוף כדי לשאת מים שיעזרו לנו לבנות ארמונות על שפת הים?",
      "a": "דלי"
    },
    "en": {
      "q": "Which simple plastic container do we use at the beach to carry water for building castles by the shore?",
      "a": "Bucket"
    }
  },
  {
    "id": "lifeguard",
    "theme": "sea",
    "he": {
      "q": "מי יושב בסוכה הגבוהה בחוף, שומר שהרוחצים לא יטבעו, ושורק במשרוקית ברגע שהוא רואה מישהו נכנס עמוק מדי (או בחורה יפה)?",
      "a": "מציל"
    },
    "en": {
      "q": "Who sits in the tall hut at the beach, keeps the swimmers from drowning, and blows a whistle the moment someone goes in too deep (or a pretty girl walks by)?",
      "a": "Lifeguard"
    }
  },
  {
    "id": "jellyfish",
    "theme": "sea",
    "he": {
      "q": "איזה יצור ימי שקוף וצורב גורם לנו לחשוב פעמיים לפני שנכנסים למים בחודש יולי?",
      "a": "מדוזה"
    },
    "en": {
      "q": "Which see-through, stinging sea creature makes us think twice before getting into the water in July?",
      "a": "Jellyfish"
    }
  },
  {
    "id": "octopus",
    "theme": "sea",
    "he": {
      "q": "איזו חיית ים חכמה מצוידת בשמונה זרועות ארוכות וביכולת להשפריץ קו של דיו שחור כדי לברוח?",
      "a": "תמנון"
    },
    "en": {
      "q": "Which clever sea animal comes equipped with eight long arms and the ability to squirt black ink to escape?",
      "a": "Octopus"
    }
  },
  {
    "id": "crab",
    "theme": "sea",
    "he": {
      "q": "איזה בעל חיים קטן שמתחבא בין סלעי החוף מוכר בזכות שתי צבתות בולטות והליכה הצידה?",
      "a": "סרטן"
    },
    "en": {
      "q": "Which little animal that hides between the beach rocks is known for its two big claws and its sideways walk?",
      "a": "Crab"
    }
  },
  {
    "id": "shark",
    "theme": "sea",
    "he": {
      "q": "איזה דג טורף ומפחיד מזוהה בעזרת סנפיר הגב המשולש שלו שמציץ מעל המים?",
      "a": "כריש"
    },
    "en": {
      "q": "Which scary predator fish is recognized by its triangular back fin peeking above the water?",
      "a": "Shark"
    }
  },
  {
    "id": "boat",
    "theme": "sea",
    "he": {
      "q": "איך קוראים לכלי שיט קטן שאפשר להשיט לאורך החוף בעזרת זוג משוטים או מנוע קטן?",
      "a": "סירה"
    },
    "en": {
      "q": "What do you call a small vessel you can take along the shore using a pair of oars or a small motor?",
      "a": "Boat"
    }
  },
  {
    "id": "sun",
    "theme": "sun",
    "he": {
      "q": "מהו כדור האש הענק בשמיים שמפיק אור וחום, ומחמם את כדור הארץ ביום?",
      "a": "שמש"
    },
    "en": {
      "q": "What is the giant ball of fire in the sky that gives off light and heat, and warms the Earth during the day?",
      "a": "Sun"
    }
  },
  {
    "id": "sunscreen",
    "theme": "sun",
    "he": {
      "q": "איזה תכשיר לבן חובה למרוח על העור לפני שיוצאים לים או לבריכה, כדי שלא נישרף ונתקלף אחר כך?",
      "a": "קרם הגנה"
    },
    "en": {
      "q": "Which white cream must you rub on your skin before going to the sea or the pool, so you don't get burned and peel afterwards?",
      "a": "Sunscreen"
    }
  },
  {
    "id": "hat",
    "theme": "sun",
    "he": {
      "q": "מה אנחנו חובשים על הראש כשאנחנו יוצאים לשמש כדי לא לקבל מכת חום?",
      "a": "כובע"
    },
    "en": {
      "q": "What do we wear on our heads when we go out in the sun so we don't get heatstroke?",
      "a": "Hat"
    }
  },
  {
    "id": "shade",
    "theme": "sun",
    "he": {
      "q": "איך נקרא האזור הכהה והקריר יותר שנוצר כששמשייה, בניין או עץ גדול חוסמים את קרני השמש?",
      "a": "צל"
    },
    "en": {
      "q": "What do you call the darker, cooler area created when a parasol, a building or a big tree blocks the sun's rays?",
      "a": "Shade"
    }
  },
  {
    "id": "sweat",
    "theme": "sun",
    "he": {
      "q": "מה הגוף שלנו מפריש ומוציא דרך העור כדי להתקרר כשאנחנו עובדים קשה או כשמאוד חם בחוץ?",
      "a": "זיעה"
    },
    "en": {
      "q": "What does our body release through the skin to cool down when we work hard or when it's very hot outside?",
      "a": "Sweat"
    }
  },
  {
    "id": "sky",
    "theme": "sun",
    "he": {
      "q": "איך נקרא המרחב הכחול והפתוח שנמצא מעל הראש שלנו כשאנחנו יוצאים החוצה ביום בהיר?",
      "a": "שמיים"
    },
    "en": {
      "q": "What do you call the big blue open space above our heads when we step outside on a clear day?",
      "a": "Sky"
    }
  },
  {
    "id": "air-conditioner",
    "theme": "sun",
    "he": {
      "q": "איזה מכשיר הוא החבר הכי טוב שלנו ביולי-אוגוסט, כשהוא שואב את הלחות ומזרים אוויר קר לחדר?",
      "a": "מזגן"
    },
    "en": {
      "q": "Which machine is our best friend in July and August, sucking out the humidity and blowing cold air into the room?",
      "a": "Air conditioner"
    }
  },
  {
    "id": "fan",
    "theme": "sun",
    "he": {
      "q": "איזה מכשיר נועד ליצור עבורנו בריזה נעימה בחדר רק בעזרת כנפיים מסתובבות?",
      "a": "מאוורר"
    },
    "en": {
      "q": "Which machine is made to give us a pleasant breeze in the room using nothing but spinning blades?",
      "a": "Fan"
    }
  },
  {
    "id": "ice-cubes",
    "theme": "sun",
    "he": {
      "q": "איך קוראים לקוביות המוצקות של מים קפואים שאנחנו זורקים לתוך כוס השתייה כדי לצנן אותה?",
      "a": "קרח"
    },
    "en": {
      "q": "What do you call the solid little blocks of frozen water we drop into a drink to cool it down?",
      "a": "Ice cubes"
    }
  },
  {
    "id": "wind",
    "theme": "sun",
    "he": {
      "q": "כשפותחים חלונות בבית בערב קיצי כדי שייכנס אוויר, אנחנו מקווים שתהיה קצת...?",
      "a": "רוח"
    },
    "en": {
      "q": "When we open the windows on a summer evening to let some air in, we're hoping for a bit of...?",
      "a": "Wind"
    }
  },
  {
    "id": "watermelon",
    "theme": "food",
    "he": {
      "q": "איזה פרי קיצי גדול ומתוק, בעל קליפה ירוקה בחוץ, חותכים למשולשים אדומים עם גרעינים שחורים?",
      "a": "אבטיח"
    },
    "en": {
      "q": "Which big sweet summer fruit with a green rind gets cut into red triangles with black seeds?",
      "a": "Watermelon"
    }
  },
  {
    "id": "melon",
    "theme": "food",
    "he": {
      "q": "איזה פרי עסיסי ומתוק מזוהה לרוב עם קליפה מחוספסת דמוית רשת ובפנים הוא כתום או ירקרק?",
      "a": "מלון"
    },
    "en": {
      "q": "Which juicy sweet fruit usually has a rough net-like rind and is orange or greenish inside?",
      "a": "Melon"
    }
  },
  {
    "id": "mango",
    "theme": "food",
    "he": {
      "q": "לאיזה פרי קיץ טרופי ומתוק יש זן בשם 'מאיה', וגלעין אחד גדול שקשה לחתוך סביבו?",
      "a": "מנגו"
    },
    "en": {
      "q": "Which sweet tropical summer fruit has a variety called 'Maya' and one big pit that's hard to cut around?",
      "a": "Mango"
    }
  },
  {
    "id": "grapes",
    "theme": "food",
    "he": {
      "q": "אילו פירות קטנים גדלים על אשכולות בגפן, ואם מייבשים אותם בשמש הם הופכים לצימוקים?",
      "a": "ענבים"
    },
    "en": {
      "q": "Which small fruits grow in bunches on a vine, and turn into raisins if you dry them in the sun?",
      "a": "Grapes"
    }
  },
  {
    "id": "corn",
    "theme": "food",
    "he": {
      "q": "איזה גידול חקלאי מורכב מגרעינים צהובים המסודרים על קלח, והופך לפופקורן כשמחממים אותו?",
      "a": "תירס"
    },
    "en": {
      "q": "Which crop is made of yellow kernels arranged on a cob, and turns into popcorn when you heat it?",
      "a": "Corn"
    }
  },
  {
    "id": "ice-cream",
    "theme": "food",
    "he": {
      "q": "איזה קינוח קפוא וקרמי נמכר בכדורים, ואנחנו הכי אוהבים לאכול אותו מתוך גביע וופל קריספי?",
      "a": "גלידה"
    },
    "en": {
      "q": "Which frozen creamy dessert is sold in scoops, and is best eaten out of a crispy waffle cone?",
      "a": "Ice cream"
    }
  },
  {
    "id": "popsicle",
    "theme": "food",
    "he": {
      "q": "איזה קינוח קפוא ומתוק על מקל אנחנו קונים בקיוסק בים, ויכול להיות עשוי מקרח בטעמים או מגלידה?",
      "a": "ארטיק"
    },
    "en": {
      "q": "Which frozen sweet treat on a stick do we buy at the beach kiosk, made of flavored ice or of ice cream?",
      "a": "Popsicle"
    }
  },
  {
    "id": "slushy",
    "theme": "food",
    "he": {
      "q": "איזה משקה קיצי וקפוא מורכב מקרח מרוסק דק דק, ומוגש בכוס פלסטיק עם קש עבה?",
      "a": "ברד"
    },
    "en": {
      "q": "Which icy summer drink is made of finely crushed ice and served in a plastic cup with a thick straw?",
      "a": "Slushy"
    }
  },
  {
    "id": "lemonade",
    "theme": "food",
    "he": {
      "q": "איזה משקה מתוק-חמוץ וקלאסי לימי הקיץ מכינים ממים, קרח, סוכר ומיץ סחוט טרי?",
      "a": "לימונדה"
    },
    "en": {
      "q": "Which classic sweet-and-sour summer drink is made of water, ice, sugar and freshly squeezed juice?",
      "a": "Lemonade"
    }
  },
  {
    "id": "water",
    "theme": "food",
    "he": {
      "q": "מהו הנוזל השקוף והבסיסי ביותר, שבלעדיו אי אפשר לחיות, ואותו הכי חשוב לשתות כשחם בחוץ?",
      "a": "מים"
    },
    "en": {
      "q": "What is the most basic clear liquid, the one we can't live without, and the most important thing to drink when it's hot outside?",
      "a": "Water"
    }
  },
  {
    "id": "pool",
    "theme": "fun",
    "he": {
      "q": "איך קוראים למקום הגדול עם המים והכלור שכולם הולכים לשחות בו בקיץ כשלא בא לנסוע לים?",
      "a": "בריכה"
    },
    "en": {
      "q": "What do you call the big place with water and chlorine where everyone goes swimming in the summer when they don't feel like driving to the sea?",
      "a": "Pool"
    }
  },
  {
    "id": "summer-camp",
    "theme": "fun",
    "he": {
      "q": "לאיזו מסגרת יומית הורים שולחים את הילדים בקיץ כדי שייהנו ממשחקים עם מדריכים, ובעיקר כדי לקבל מהם קצת שקט?",
      "a": "קייטנה"
    },
    "en": {
      "q": "Which daytime program do parents send the kids to in the summer so they can enjoy games with counselors — and mostly so the parents get some quiet?",
      "a": "Summer camp"
    }
  },
  {
    "id": "summer-vacation",
    "theme": "fun",
    "he": {
      "q": "איך קוראים לתקופה המסורתית שמתחילה בסוף יוני, שבה בתי הספר סגורים ואין לימודים?",
      "a": "חופש גדול"
    },
    "en": {
      "q": "What do you call the traditional period starting at the end of June, when the schools are closed and there are no lessons?",
      "a": "Summer vacation"
    }
  },
  {
    "id": "bicycle",
    "theme": "fun",
    "he": {
      "q": "איזה כלי תחבורה מבוסס על שיווי משקל של הרוכב, ומתקדם קדימה רק בעזרת סיבוב פדלים?",
      "a": "אופניים"
    },
    "en": {
      "q": "Which vehicle relies on the rider's balance and moves forward only by turning the pedals?",
      "a": "Bicycle"
    }
  },
  {
    "id": "flip-flops",
    "theme": "fun",
    "he": {
      "q": "אילו נעלי קיץ פתוחות אנחנו נועלים בדרך לים או לבריכה, ויש להן רק רצועה אחת שמפרידה בין האצבעות?",
      "a": "כפכפים"
    },
    "en": {
      "q": "Which open summer shoes do we wear on the way to the sea or the pool, with just one strap that goes between the toes?",
      "a": "Flip-flops"
    }
  },
  {
    "id": "kite",
    "theme": "fun",
    "he": {
      "q": "איזה חפץ בנוי ממסגרת קלה ומפרש צבעוני, וכל הכיף זה לשחרר לו חוט ולראות אותו ממריא ברוח?",
      "a": "עפיפון"
    },
    "en": {
      "q": "Which object is built from a light frame and a colorful sail, and the whole fun is letting out its string and watching it soar in the wind?",
      "a": "Kite"
    }
  },
  {
    "id": "sprinkler",
    "theme": "fun",
    "he": {
      "q": "איזה מתקן מסתובב בגינה, מחובר לצינור ומשפריץ מים כדי להשקות את הדשא?",
      "a": "ממטרה"
    },
    "en": {
      "q": "Which spinning gadget in the garden is hooked to a hose and sprays water to keep the grass watered?",
      "a": "Sprinkler"
    }
  },
  {
    "id": "tent",
    "theme": "fun",
    "he": {
      "q": "איזה מבנה ארעי מבד ומקלות אנחנו מקימים כשיוצאים לקמפינג ורוצים לישון בטבע?",
      "a": "אוהל"
    },
    "en": {
      "q": "Which temporary structure of cloth and poles do we put up when we go camping and want to sleep out in nature?",
      "a": "Tent"
    }
  },
  {
    "id": "campfire",
    "theme": "fun",
    "he": {
      "q": "מה מדליקים מקרשים וענפים בל\"ג בעומר או בערב בשטח, ויושבים מסביבה לשיר ולאפות תפוחי אדמה?",
      "a": "מדורה"
    },
    "en": {
      "q": "What do you light from planks and branches on Lag BaOmer or on an evening outdoors, sitting around it to sing and bake potatoes?",
      "a": "Campfire"
    }
  },
  {
    "id": "stars",
    "theme": "fun",
    "he": {
      "q": "אילו נקודות אור קטנות ומנצנצות אפשר לראות בשמיים כשמסתכלים למעלה בלילה?",
      "a": "כוכבים"
    },
    "en": {
      "q": "Which tiny twinkling points of light can you see in the sky when you look up at night?",
      "a": "Stars"
    }
  },
  {
    "id": "mosquito",
    "theme": "nature",
    "he": {
      "q": "איזה מעופף קטן וטורדני לא נותן לנו לישון בלילות הקיץ ומשאיר אותנו עם עקיצות מגרדות?",
      "a": "יתוש"
    },
    "en": {
      "q": "Which small annoying flyer keeps us from sleeping on summer nights and leaves us with itchy bites?",
      "a": "Mosquito"
    }
  },
  {
    "id": "cricket",
    "theme": "nature",
    "he": {
      "q": "איזה חרק מתחבא בשיחים בשעות הערב ומפיק קול ניסור קצבי שמלווה את לילות הקיץ?",
      "a": "צרצר"
    },
    "en": {
      "q": "Which insect hides in the bushes in the evening and makes the rhythmic sawing sound that accompanies summer nights?",
      "a": "Cricket"
    }
  },
  {
    "id": "butterfly",
    "theme": "nature",
    "he": {
      "q": "איזה יצור צבעוני ומרשים מתעופף בין פרחים, לאחר שעבר גלגול מצורה של זחל?",
      "a": "פרפר"
    },
    "en": {
      "q": "Which colorful, impressive creature flutters between the flowers after transforming from a caterpillar?",
      "a": "Butterfly"
    }
  },
  {
    "id": "sunflower",
    "theme": "nature",
    "he": {
      "q": "איזה פרח צהוב וענק מגיע לגובה רב, וממנו אנחנו מקבלים את הגרעינים השחורים שאנחנו מפצחים?",
      "a": "חמנייה"
    },
    "en": {
      "q": "Which giant yellow flower grows very tall, and gives us the black seeds we love cracking open?",
      "a": "Sunflower"
    }
  }
];
