/* ============================================================
   Draft Night FC · the questions
   Edit this file to change the draft questions. Each question is one line:

     {t:"The question", h:"A short hint under it"},

   Optional tags on player questions (add them after the hint):
     cur:1  needs a current top-five-league club (never drawn on the
            "Outside the bubble" dice roll)
     old:1  needs a long career (never drawn on the "Youth only" roll)
     nat:1  about nationality (never drawn on the "No repeats" roll)

   Keep the commas between lines and the brackets around each list.
   Save, commit, and Vercel puts the new version live in a minute.
   Claude referees every question, so plain English is fine.
   ============================================================ */

// Player questions: the main pool for starter and bench rounds.
export const PLAYER_QUESTIONS = [
 // numbers
 {t:"Has scored 20 or more league goals in a single season",h:"Any top-flight league, any season."},
 {t:"Has scored 30 or more goals in all competitions in one season",h:"Club football, one season."},
 {t:"Has made 15 or more league assists in a single season",h:"Any top-flight league."},
 {t:"Has made 10 or more Premier League assists in one season",h:"One Premier League campaign."},
 {t:"Has scored 10 or more goals in a single Champions League campaign",h:"Qualifiers don't count."},
 {t:"Has scored 100 or more league goals in his career",h:"All leagues added together.",old:1},
 {t:"Has scored 25 or more goals for his country",h:"Senior international goals.",old:1},
 {t:"Has made 50 or more Champions League appearances",h:"Career total.",old:1},
 {t:"Has scored a Premier League hat-trick",h:"Three in one game."},
 {t:"Has scored a Champions League hat-trick",h:"Group stage, league phase or knockouts."},
 {t:"Has scored a direct free kick in the Champions League",h:"Straight in from a free kick."},
 {t:"Was top scorer at a major international tournament",h:"World Cup, Euros, Copa América, AFCON, Asian Cup or Gold Cup. Shared counts."},
 {t:"Has won a top-five league's player of the season award",h:"Premier League, PFA, La Liga, Serie A, Bundesliga or Ligue 1."},
 {t:"Has scored in a World Cup knockout match",h:"Round of 32 or later."},
 {t:"Has assisted a goal in a Champions League final",h:"Any final."},
 // EA FC / FIFA
 {t:"Has had a FIFA or EA FC base card rated 90 or higher",h:"Any edition of the game."},
 {t:"Has had 95 or more pace on a FIFA or EA FC base card",h:"Any edition."},
 {t:"Has been on the cover of FIFA or EA Sports FC",h:"Any edition, any region."},
 {t:"Has made a FIFA or EA FC Team of the Year",h:"The TOTY XI in any edition."},
 {t:"Has had 5-star skill moves in FIFA or EA FC",h:"Any edition."},
 {t:"Had an 85+ FIFA or EA FC card while playing outside Europe's top five leagues",h:"Portugal, the Netherlands, Saudi Arabia, MLS, Turkey..."},
 {t:"Had a FIFA or EA FC card rated 80 or higher as a teenager",h:"Base card, aged 19 or under."},
 // careers
 {t:"Has played in at least three of Europe's top five leagues",h:"England, Spain, Italy, Germany, France."},
 {t:"Has played for clubs on two different continents",h:"Europe plus Asia, the Americas, Africa..."},
 {t:"Has played for clubs on three different continents",h:"Rare, but they exist.",old:1},
 {t:"Has played for six or more senior clubs",h:"Loans count.",old:1},
 {t:"Joined Real Madrid, Barcelona or Bayern before turning 21",h:"Senior or B-team signing."},
 {t:"Was released by a youth academy before making it big",h:"Rejected as a kid, proved them wrong."},
 {t:"Went back to a former club for a second spell",h:"Left and came back."},
 {t:"Moved to Saudi Arabia, MLS or Qatar aged 30 or older",h:"Any point in his career.",old:1},
 {t:"Has won the Champions League with a club outside Spain",h:"In a winning squad that isn't Real Madrid or Barcelona."},
 {t:"Has won the Europa League or the Conference League",h:"In the winning squad. UEFA Cup counts."},
 {t:"Has been relegated from one of Europe's top five leagues",h:"In the squad the season they went down."},
 {t:"Has won top-flight league titles in two different countries",h:"Two countries, at least one title each."},
 {t:"Has been sold for €80m or more",h:"A single transfer fee."},
 {t:"Has played for two fierce rivals",h:"Figo, Sol Campbell, Götze, Higuaín, Luís Enrique..."},
 // derbies & big games
 {t:"Has scored in El Clásico",h:"Real Madrid v Barcelona, any competition."},
 {t:"Has scored in Der Klassiker",h:"Bayern v Dortmund, any competition."},
 {t:"Has scored in the Milan derby",h:"Milan v Inter, any competition."},
 {t:"Has scored in the Manchester, North London or Merseyside derby",h:"Any competition."},
 {t:"Has played in a Champions League final and lost",h:"On the pitch in a losing final."},
 {t:"Has played in a World Cup semi-final",h:"Any World Cup."},
 // identity, quirks
 {t:"Is known by a single name on his shirt",h:"Pedri, Kaká, Rodri, Vitinha, Casemiro..."},
 {t:"Represents a different country from the one he was born in",h:"Born in one, plays for another.",nat:1},
 {t:"Represents a country of fewer than 10 million people",h:"Croatia, Uruguay, Norway, Denmark, Ireland...",nat:1},
 {t:"His surname is also a city, country or region",h:"Defend it if it's borderline."},
 {t:"Has a famous goal celebration",h:"Widely recognised."},
 {t:"Is naturally left-footed",h:"His stronger foot is the left."},
 {t:"Is 6 ft 2 in (188 cm) or taller",h:"Listed height."},
 {t:"Is 5 ft 8 in (173 cm) or shorter",h:"Listed height."},
 {t:"Has captained his country",h:"At least one match with the armband."},
 {t:"Has played under José Mourinho",h:"Any club or national team."},
 {t:"Has played under Pep Guardiola",h:"Barcelona, Bayern or Manchester City."},
 {t:"Has played under Carlo Ancelotti",h:"Any of his clubs, or Brazil."},
 {t:"Has been a club teammate of Lionel Messi",h:"Barcelona, PSG or Inter Miami."},
 {t:"Has been a club teammate of Cristiano Ronaldo",h:"Sporting, Man United, Real Madrid, Juventus or Al-Nassr."},
 {t:"Has won the Golden Boy award",h:"Europe's best player under 21."},
 // current
 {t:"Currently plays in the Premier League",h:"This season.",cur:1},
 {t:"Currently plays in La Liga or Serie A",h:"This season.",cur:1},
 {t:"Currently plays in the Bundesliga or Ligue 1",h:"This season.",cur:1},
 {t:"Currently plays for a club in this season's Champions League",h:"League phase or later."},
 // family, names, looks
 {t:"His father also played professional football",h:"Sons of pros: think Maldini, Thuram, Weah, Chiesa..."},
 {t:"Has played in the same club side as his brother",h:"Brothers in the same senior squad at the same time."},
 {t:"His first name and surname start with the same letter",h:"Use his common full name: Mason Mount, Kalidou Koulibaly..."},
 {t:"His shirt name is four letters or fewer",h:"As printed on the back: Kane, Saka, Rice..."},
 {t:"His surname is ten letters or longer",h:"Lewandowski, Aubameyang, Schweinsteiger..."},
 {t:"Has a famous nickname",h:"Widely used, not just a shortened name: El Niño, Il Divin Codino..."},
 {t:"Is famous for an iconic hairstyle",h:"Subjective, but the hair has to be known."},
 // moments
 {t:"Has scored with a bicycle kick in a competitive match",h:"An overhead kick, any club or country."},
 {t:"Has scored from inside his own half",h:"Any competitive match."},
 {t:"Has scored a Panenka penalty",h:"The chipped penalty down the middle, competitive match."},
 {t:"Has missed in a major tournament penalty shootout",h:"World Cup, Euros, Copa América or AFCON."},
 {t:"Has scored in a Champions League final",h:"Any final. Shootouts don't count."},
 {t:"Has scored in a Champions League semi-final",h:"Either leg."},
 {t:"Has scored a hat-trick for his country",h:"Senior international, any match."},
 {t:"Has been sent off at a World Cup",h:"Any World Cup match."},
 // trophies & tournaments
 {t:"Has won the World Cup",h:"In the winning squad.",nat:1},
 {t:"Has won the European Championship",h:"In the winning squad.",nat:1},
 {t:"Has won the Copa América",h:"In the winning squad.",nat:1},
 {t:"Has won the Africa Cup of Nations",h:"In the winning squad.",nat:1},
 {t:"Has won both the Champions League and the World Cup",h:"At any points in his career."},
 {t:"Has won a continental treble with his club",h:"League, domestic cup and Champions League in one season."},
 {t:"Has finished in the Ballon d'Or top three",h:"Any year."},
 {t:"Played in a World Cup final",h:"On the pitch, win or lose."},
 {t:"Played at the 2026 World Cup",h:"Made at least one appearance."},
 {t:"Scored at the 2026 World Cup",h:"Shootout penalties don't count."},
 {t:"Has played in the 32-team Club World Cup",h:"The 2025 tournament in the USA."},
 {t:"Has played in the Copa Libertadores",h:"South America's Champions League."},
 {t:"Has played in an Old Firm derby",h:"Celtic v Rangers."},
 // careers & connections
 {t:"Came through La Masia or Ajax's academy",h:"Barcelona's or Ajax's youth system."},
 {t:"Trained in a French academy but represents another country",h:"Developed in France, capped by someone else.",nat:1},
 {t:"Has played for two clubs in the same city",h:"Milan, Madrid, London, Manchester, Rome, Istanbul..."},
 {t:"Has played in both the Premier League and Serie A",h:"At least one league game in each."},
 {t:"Has played in both La Liga and the Bundesliga",h:"At least one league game in each."},
 {t:"Has played club football in Turkey",h:"Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor..."},
 {t:"Has played in the Saudi Pro League",h:"Any club, any season."},
 {t:"Was once the world's most expensive player",h:"Held the world transfer record at the time."},
 {t:"Has been a club teammate of both Messi and Cristiano Ronaldo",h:"Not necessarily at the same time. Rare, but they exist."},
 {t:"Has been a club teammate of Erling Haaland",h:"Molde, Salzburg, Dortmund or Man City."},
 {t:"Has been a club teammate of Kylian Mbappé",h:"Monaco, PSG or Real Madrid."},
 {t:"Was a club teammate of Zidane, Ronaldinho or Ronaldo Nazário",h:"Any one of the three.",old:1},
 {t:"Has played under Jürgen Klopp",h:"Mainz, Dortmund or Liverpool."},
 {t:"Has played under Diego Simeone",h:"Atlético Madrid, or his earlier clubs."},
 {t:"Has played under Zinedine Zidane",h:"Real Madrid, either spell."},
 {t:"Has worn the number 7 for Manchester United, Real Madrid or Juventus",h:"Any season."},
 {t:"Has worn the number 10 for his country",h:"As the regular 10 or at a major tournament.",nat:1},
 {t:"Scored 20+ goals in a season without being a striker",h:"Winger, midfielder or defender, all competitions."},
 // this season
 {t:"Changed clubs in the summer 2026 transfer window",h:"Permanent or loan, any league."},
 {t:"Is a club captain this season",h:"Named captain, any top-flight league."},
 {t:"Plays for a newly promoted top-five-league club",h:"Promoted for this season.",cur:1},
 // subjective
 {t:"A big-money signing who flopped",h:"Subjective. Your opponent will have opinions."},
 {t:"The player you'd trust with a penalty in a World Cup final",h:"Subjective. Defend it."},
 {t:"The fastest player you can think of",h:"Subjective, but he has to be genuinely rapid."},
 {t:"Famous for one unforgettable season",h:"Subjective. A one-season wonder or a career-best year."},
 {t:"Changed position and became better for it",h:"Subjective. Winger to striker, midfielder to centre-back..."},
 {t:"A genuine dead-ball specialist",h:"Subjective. Free kicks, corners or long throws."},
 {t:"The player you'd pick to win one game, prime against prime",h:"Subjective. Defend it."},
 {t:"A player whose career was derailed by injuries",h:"Subjective, but it has to be a fair description."},
 {t:"Looked destined for greatness at 19",h:"Subjective. Whether he got there or not."},
 {t:"A player rival fans love to hate",h:"Subjective."},
 {t:"A cult hero at one of his clubs",h:"Subjective. Loved beyond his stats."},
 // workshop additions (Oct 2026), appended at the end so existing ids don't shift
 {t:"Has scored in a World Cup final",h:"Any final. Shootouts don't count."},
 {t:"Has scored an own goal at a World Cup or Euros",h:"Any match at the tournament."},
 {t:"Has scored four or more goals in one top-five-league match",h:"Premier League, La Liga, Serie A, Bundesliga or Ligue 1."},
 {t:"Scored the winner in a major final in the 85th minute or later",h:"Extra time counts. Domestic cup, league cup, European or international final."},
 {t:"Has played in at least four of Europe's top five leagues",h:"England, Spain, Italy, Germany, France. The hard version."},
 {t:"Is a one-club man with 10+ senior seasons",h:"Never moved permanently. Loans are fine.",old:1},
 {t:"Has won the Champions League with two different clubs",h:"In the winning squad both times.",old:1},
 {t:"Has finished top scorer in a top-five league",h:"Outright or shared. Golden Boot, Pichichi, Capocannoniere..."},
 {t:"Has 300+ career appearances and no major trophy",h:"League, domestic cup, league cup, European or international title. Super cups don't count.",old:1},
 {t:"Has 90 or more pace on his EA FC 27 base card",h:"Base gold card, not promos."},
 {t:"Has a 5-star weak foot in FIFA or EA FC",h:"Any edition."},
 {t:"Has 85 or more physical on his EA FC 27 base card",h:"Base gold card, not promos."},
 {t:"Is 5 ft 7 in (170 cm) or shorter and rated 80+ in EA FC 27",h:"Small but elite. Base card."},
 {t:"Is an outfield player 6 ft 4 in (193 cm) or taller",h:"Listed height. Goalkeepers don't count."},
 {t:"Has been frozen out or publicly slammed by his own manager",h:"Subjective. A widely reported falling-out."},
 {t:"Has switched international allegiance",h:"Capped by one nation at any level, then a senior cap for another.",nat:1},
 {t:"Represents a country that has never played at a men's World Cup",h:"2026 debutants like Cape Verde, Curaçao and Jordan no longer count.",nat:1},
 {t:"Represents a country of fewer than 5 million people",h:"Uruguay, Croatia, Wales, Georgia, Slovenia...",nat:1},
 {t:"Has scored at a World Cup after coming off the bench",h:"Any World Cup, shootouts don't count."},
 {t:"Scored 20+ league goals in a season aged 33 or older",h:"Age at the start of that season.",old:1},
 {t:"Is English and currently plays abroad",h:"Any club outside England.",nat:1},
 {t:"Is currently on loan",h:"This season."}
];

// "Has played for X" questions, one per club in this list.
export const CLUBS = ["Real Madrid","Barcelona","Atlético Madrid","Sevilla","Valencia","Villarreal","Bayern Munich","Borussia Dortmund","Bayer Leverkusen","RB Leipzig","Wolfsburg","Juventus","AC Milan","Inter Milan","Roma","Napoli","Lazio","Fiorentina","Paris Saint-Germain","Marseille","Lyon","Monaco","Manchester United","Manchester City","Liverpool","Arsenal","Chelsea","Tottenham","Aston Villa","Everton","Newcastle United","Ajax","PSV","Benfica","Porto","Sporting CP","Celtic","Galatasaray","Inter Miami","Al-Nassr or Al-Hilal"];

// "Represents X" questions, one per country in this list.
export const NATIONS = ["Portugal","the Netherlands","Belgium","Croatia","Uruguay","Colombia","Senegal","Nigeria","Japan","the USA","Norway","Denmark","Morocco","Mexico","Ivory Coast","Scotland","Wales","Serbia","Switzerland","Poland","Austria","South Korea","Egypt","Ghana","Cameroon","Sweden","Turkey","Chile","Algeria","Ecuador","Brazil","Argentina","France","England","Spain","Germany","Italy"];

// "Has played for both X and Y" questions.
export const CLUB_PAIRS = [["Barcelona","Liverpool"],["Arsenal","Barcelona"],["Real Madrid","Manchester United"],["Chelsea","Real Madrid"],["Juventus","Real Madrid"],["AC Milan","Inter Milan"],["Bayern Munich","Borussia Dortmund"],["Paris Saint-Germain","Barcelona"],["Manchester City","Barcelona"],["Arsenal","Manchester City"],["Liverpool","Real Madrid"],["Tottenham","Real Madrid"],["Atlético Madrid","Chelsea"],["Ajax","Barcelona"],["Napoli","Juventus"],["Monaco","Real Madrid"]];

// How often each kind of player question comes up (they're relative weights).
export const QUESTION_MIX = { questions: 52, clubPairs: 16, clubs: 16, nations: 16 };

// Manager round questions.
export const MANAGER_QUESTIONS = [
 {t:"Has won the Champions League as a manager",h:"Or the European Cup."},
 {t:"Has managed a national team at a World Cup",h:"Any World Cup."},
 {t:"Won the World Cup as a player",h:"And went on to manage."},
 {t:"Has managed clubs in at least three different countries",h:"Senior club jobs."},
 {t:"Has managed in Serie A",h:"Any club, any era."},
 {t:"Has won the league in two different countries",h:"As a manager."},
 {t:"Managed a club he used to play for",h:"Player first, then manager of the same club."},
 {t:"Has managed in the Premier League since 2020",h:"At least one game in charge."},
 {t:"Is famous for an iconic touchline look or habit",h:"Subjective. The look has to be widely known."},
 {t:"Has managed in the Bundesliga",h:"Any club, any era."},
 {t:"Was a goalkeeper or defender as a player",h:"His main playing position."},
 {t:"Has managed Real Madrid, Barcelona, Bayern or Juventus",h:"Any era, interim counts."},
 {t:"Won the league in his first full season at a club",h:"As a manager."},
 {t:"Was sacked within a year of winning a major trophy",h:"League, Champions League or international title."},
 {t:"Is famous for a feud with another manager",h:"Subjective. A rivalry everyone knows."}
];

// Stadium round questions.
export const STADIUM_QUESTIONS = [
 {t:"Has hosted a Champions League or European Cup final",h:"Any year."},
 {t:"Holds more than 70,000 fans",h:"Current capacity."},
 {t:"Is named after a person",h:"Not a sponsor: Maradona, Puskás, Bernabéu..."},
 {t:"Has hosted a World Cup match",h:"Any tournament, any round."},
 {t:"Is in a national capital",h:"The stadium itself, not just the club."},
 {t:"Is shared by two clubs",h:"Now or in the recent past."},
 {t:"Is in South America",h:"Any league ground or national stadium."},
 {t:"Is home to a club that has won the European Cup",h:"The club's current home."},
 {t:"Has hosted a World Cup final",h:"Any year."},
 {t:"Is famous for one legendary stand",h:"Yellow Wall, the Kop, the Holte End..."},
 {t:"Sits more than 1,000 metres above sea level",h:"Thin air: Mexico City, Bogotá, Quito, La Paz..."},
 {t:"Opened or was fully rebuilt after 2000",h:"A new stadium or a complete rebuild."},
 {t:"Is in Turkey, Greece or the Balkans",h:"Any league or national stadium."},
 {t:"Has (or had) a running track around the pitch",h:"Olympic-style grounds count."},
 {t:"Is notorious for a hostile atmosphere",h:"Subjective. A genuinely intimidating away day."}
];

// Aura round questions: a moment, ritual, chant or curse.
export const AURA_QUESTIONS = [
 {t:"A famous comeback",h:"Istanbul 2005, La Remontada, Camp Nou 1999..."},
 {t:"A famous upset or giant-killing",h:"Leicester 2016, Greece 2004, Saudi Arabia v Argentina..."},
 {t:"A superstition, ritual or curse",h:"Blanc kissing Barthez's head, the Benfica curse..."},
 {t:"One iconic moment",h:"A goal, a save or a celebration everyone remembers."},
 {t:"A fan chant or anthem",h:"You'll Never Walk Alone, Major Tom, Seven Nation Army..."},
 {t:"A club's mystique",h:"Fergie time, Anfield European nights, miedo escénico..."},
 {t:"A famous last-minute winner",h:"Agüerooo, Iniesta at Stamford Bridge, Camp Nou 1999..."},
 {t:"A legendary penalty shootout",h:"One people still talk about."},
 {t:"An infamous refereeing or VAR moment",h:"The Hand of God, Lampard's ghost goal..."},
 {t:"A manager's iconic quote or rant",h:"The Special One, \"I would love it\"..."},
 // the silly ones
 {t:"The most embarrassing miss of all time",h:"Torres at Old Trafford, Rosenthal hitting the post, Gyan's penalty..."},
 {t:"A celebration that went horribly wrong",h:"Palermo's collapsing wall, Pellè's dance, Kanu's backflip..."},
 {t:"A goalkeeper howler",h:"Karius in Kyiv, Robinson's air kick, the Carroll ghost goal..."},
 {t:"An animal that stole the show",h:"The Anfield cat, the Boca dog, the Belgian ref's pigeon..."},
 {t:"The daftest injury in football history",h:"Cañizares and the aftershave, Beasant and the salad cream..."},
 {t:"A haircut that deserves its own aura",h:"Ronaldo's 2002 triangle, Baggio's ponytail, Valderrama..."},
 {t:"A press conference meltdown",h:"Trapattoni's \"Strunz!\", Keegan's \"I would love it\", \"I prefer not to speak\"..."},
 {t:"A transfer saga that broke the internet",h:"Figo's pig's head, Here we go, the Ali Dia phone call..."},
 {t:"A wildly unnecessary piece of skill",h:"Higuita's scorpion, Neymar's rainbow flick, Jay-Jay Okocha..."},
 {t:"The beach ball, the snowball or a rogue object",h:"Liverpool's beach ball goal at Sunderland and friends."},
 {t:"A player who got sent off for something ridiculous",h:"Zidane's headbutt, Cantona's kung-fu kick, Batty and Le Saux..."},
 {t:"Peak tunnel or bus drama",h:"Pizzagate, the Keane-Vieira tunnel, a team bus lost on the way..."}
];
