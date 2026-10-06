/* ============================================================
   Draft Night FC · the wheel's player pool
   When a pick times out or is ruled wrong, that slot goes to the wheel
   at the end of the player rounds. The wheel first picks a tier:

     50%  under 75      35%  75 to 84      10%  85 to 89      5%  90+

   then a random player from this pool who plays that position and
   isn't already drafted. Ratings are the player at his prime.

   One player per line:  "Name|rating|country|club"
   Positions: GK goalkeeper, CB centre-back, FB full-back, DM holding
   midfielder, CM central midfielder, AM attacking midfielder,
   W winger, ST striker. Add or remove names freely.
   ============================================================ */
export const WHEEL_ODDS = [
  { label: "Under 75", min: 0, max: 74, chance: 50 },
  { label: "75–84", min: 75, max: 84, chance: 35 },
  { label: "85–89", min: 85, max: 89, chance: 10 },
  { label: "90+", min: 90, max: 99, chance: 5 }
];

export const WHEEL_POOL = {
  GK: [
    // under 75
    "Massimo Taibi|62|Italy|Manchester United", "Roy Carroll|70|Northern Ireland|Manchester United", "Heurelho Gomes|71|Brazil|Tottenham",
    "Scott Carson|72|England|Derby County", "Loris Karius|73|Germany|Liverpool", "Wayne Hennessey|72|Wales|Crystal Palace",
    "Tom Heaton|73|England|Burnley", "Sam Johnstone|74|England|Crystal Palace", "Angus Gunn|71|Scotland|Norwich City", "Paul Robinson|74|England|Tottenham",
    // 75 to 84
    "Jordan Pickford|82|England|Everton", "Aaron Ramsdale|80|England|Arsenal", "Joe Hart|82|England|Manchester City", "Kepa Arrizabalaga|80|Spain|Chelsea",
    "André Onana|82|Cameroon|Manchester United", "Édouard Mendy|82|Senegal|Chelsea", "Ben Foster|77|England|Watford", "Guglielmo Vicario|83|Italy|Tottenham",
    "David Raya|84|Spain|Arsenal", "Bernd Leno|82|Germany|Fulham",
    // 85 to 89
    "Petr Čech|89|Czech Republic|Chelsea", "Edwin van der Sar|89|Netherlands|Manchester United", "Jan Oblak|89|Slovenia|Atlético Madrid",
    "Marc-André ter Stegen|88|Germany|Barcelona", "David de Gea|88|Spain|Manchester United", "Ederson|87|Brazil|Manchester City",
    "Gianluigi Donnarumma|88|Italy|Paris Saint-Germain", "Hugo Lloris|86|France|Tottenham", "Oliver Kahn|89|Germany|Bayern Munich",
    // 90+
    "Gianluigi Buffon|93|Italy|Juventus", "Manuel Neuer|92|Germany|Bayern Munich", "Iker Casillas|91|Spain|Real Madrid",
    "Peter Schmeichel|90|Denmark|Manchester United", "Alisson|90|Brazil|Liverpool", "Lev Yashin|94|Soviet Union|Dynamo Moscow", "Thibaut Courtois|90|Belgium|Real Madrid"
  ],
  CB: [
    "Phil Jones|73|England|Manchester United", "Shkodran Mustafi|73|Germany|Arsenal", "Titus Bramble|66|England|Newcastle United", "Marcos Rojo|72|Argentina|Manchester United",
    "Eric Bailly|74|Ivory Coast|Manchester United", "Ben Mee|73|England|Burnley", "Scott Dann|72|England|Crystal Palace", "Jack Stephens|69|England|Southampton",
    "Steve Cook|71|England|Bournemouth", "Ciaran Clark|70|Ireland|Newcastle United",
    "Harry Maguire|81|England|Manchester United", "Victor Lindelöf|79|Sweden|Manchester United", "Lewis Dunk|80|England|Brighton", "Conor Coady|77|England|Wolves",
    "James Tarkowski|79|England|Everton", "Marc Guéhi|82|England|Crystal Palace", "Tyrone Mings|78|England|Aston Villa", "Dayot Upamecano|82|France|Bayern Munich",
    "Ibrahima Konaté|84|France|Liverpool", "Cristian Romero|84|Argentina|Tottenham", "Jonny Evans|77|Northern Ireland|Leicester City", "Joël Matip|82|Cameroon|Liverpool",
    "John Terry|89|England|Chelsea", "Rio Ferdinand|89|England|Manchester United", "Nemanja Vidić|88|Serbia|Manchester United", "Carles Puyol|89|Spain|Barcelona",
    "Giorgio Chiellini|89|Italy|Juventus", "Mats Hummels|88|Germany|Borussia Dortmund", "Rúben Dias|88|Portugal|Manchester City", "William Saliba|87|France|Arsenal",
    "Raphaël Varane|87|France|Real Madrid", "Kalidou Koulibaly|87|Senegal|Napoli", "Pepe|87|Portugal|Real Madrid",
    "Paolo Maldini|95|Italy|AC Milan", "Franz Beckenbauer|96|Germany|Bayern Munich", "Franco Baresi|94|Italy|AC Milan", "Fabio Cannavaro|92|Italy|Juventus",
    "Alessandro Nesta|91|Italy|AC Milan", "Virgil van Dijk|91|Netherlands|Liverpool", "Sergio Ramos|91|Spain|Real Madrid", "Thiago Silva|90|Brazil|Paris Saint-Germain"
  ],
  FB: [
    "Djimi Traoré|65|Mali|Liverpool", "Matteo Darmian|74|Italy|Inter Milan", "Danny Simpson|70|England|Leicester City", "Davide Zappacosta|73|Italy|Chelsea",
    "Joel Ward|72|England|Crystal Palace", "Erik Pieters|70|Netherlands|Stoke City", "Tony Hibbert|68|England|Everton", "José Holebas|72|Greece|Watford",
    "Brandon Williams|68|England|Manchester United", "Aaron Cresswell|74|England|West Ham",
    "Kieran Trippier|82|England|Newcastle United", "Luke Shaw|81|England|Manchester United", "Ben Chilwell|80|England|Chelsea", "Pedro Porro|82|Spain|Tottenham",
    "Ben White|82|England|Arsenal", "Oleksandr Zinchenko|80|Ukraine|Arsenal", "Marc Cucurella|82|Spain|Chelsea", "Reece James|84|England|Chelsea",
    "Aaron Wan-Bissaka|79|England|Manchester United", "Lucas Digne|79|France|Aston Villa", "Kieran Gibbs|76|England|Arsenal",
    "Ashley Cole|89|England|Chelsea", "Marcelo|89|Brazil|Real Madrid", "Trent Alexander-Arnold|87|England|Liverpool", "Andrew Robertson|87|Scotland|Liverpool",
    "Achraf Hakimi|87|Morocco|Paris Saint-Germain", "Kyle Walker|86|England|Manchester City", "Dani Carvajal|87|Spain|Real Madrid", "Patrice Evra|87|France|Manchester United",
    "Jordi Alba|87|Spain|Barcelona", "Theo Hernández|86|France|AC Milan", "Alphonso Davies|86|Canada|Bayern Munich",
    "Cafu|92|Brazil|AC Milan", "Roberto Carlos|91|Brazil|Real Madrid", "Philipp Lahm|91|Germany|Bayern Munich", "Dani Alves|90|Brazil|Barcelona", "Javier Zanetti|90|Argentina|Inter Milan"
  ],
  DM: [
    "Danny Drinkwater|73|England|Leicester City", "Tom Cleverley|71|England|Manchester United", "Kléberson|69|Brazil|Manchester United", "Joey Barton|73|England|Manchester City",
    "Mark Noble|74|England|West Ham", "Nampalys Mendy|70|Senegal|Leicester City", "Victor Wanyama|74|Kenya|Tottenham", "Lee Cattermole|70|England|Sunderland",
    "Wilfred Ndidi|81|Nigeria|Leicester City", "Nemanja Matić|82|Serbia|Chelsea", "Thomas Partey|83|Ghana|Arsenal", "Aurélien Tchouaméni|84|France|Real Madrid",
    "Pierre-Emile Højbjerg|80|Denmark|Tottenham", "Kalvin Phillips|79|England|Leeds United", "Yves Bissouma|80|Mali|Tottenham", "Fred|79|Brazil|Manchester United",
    "Moisés Caicedo|84|Ecuador|Chelsea",
    "N'Golo Kanté|89|France|Chelsea", "Casemiro|88|Brazil|Real Madrid", "Fabinho|86|Brazil|Liverpool", "Michael Essien|88|Ghana|Chelsea",
    "Javier Mascherano|87|Argentina|Barcelona", "Gennaro Gattuso|87|Italy|AC Milan", "Roy Keane|89|Ireland|Manchester United", "Claude Makélélé|89|France|Real Madrid",
    "Rodri|91|Spain|Manchester City", "Sergio Busquets|90|Spain|Barcelona", "Patrick Vieira|90|France|Arsenal", "Frank Rijkaard|91|Netherlands|AC Milan"
  ],
  CM: [
    "Anderson|71|Brazil|Manchester United", "Jack Rodwell|70|England|Manchester City", "Jonjo Shelvey|74|England|Newcastle United", "Tom Huddlestone|72|England|Tottenham",
    "Gary O'Neil|70|England|Portsmouth", "James McCarthy|73|Ireland|Everton", "Harry Arter|68|Ireland|Bournemouth", "Lewis Cook|71|England|Bournemouth",
    "Jordan Henderson|82|England|Liverpool", "James Milner|80|England|Liverpool", "James Ward-Prowse|80|England|Southampton", "Alexis Mac Allister|84|Argentina|Liverpool",
    "Dominik Szoboszlai|82|Hungary|Liverpool", "Conor Gallagher|80|England|Chelsea", "Scott McTominay|82|Scotland|Napoli", "Youri Tielemans|81|Belgium|Leicester City",
    "Mateo Kovačić|84|Croatia|Chelsea", "Jorginho|83|Italy|Chelsea",
    "Jude Bellingham|89|England|Real Madrid", "Federico Valverde|87|Uruguay|Real Madrid", "Pedri|87|Spain|Barcelona", "Declan Rice|87|England|Arsenal",
    "Nicolò Barella|87|Italy|Inter Milan", "Michael Ballack|89|Germany|Chelsea", "Clarence Seedorf|89|Netherlands|AC Milan", "Bastian Schweinsteiger|89|Germany|Bayern Munich",
    "Edgar Davids|87|Netherlands|Juventus", "Xabi Alonso|89|Spain|Real Madrid", "Cesc Fàbregas|88|Spain|Arsenal",
    "Xavi|94|Spain|Barcelona", "Andrés Iniesta|93|Spain|Barcelona", "Steven Gerrard|91|England|Liverpool", "Frank Lampard|90|England|Chelsea",
    "Andrea Pirlo|91|Italy|AC Milan", "Luka Modrić|92|Croatia|Real Madrid", "Toni Kroos|91|Germany|Real Madrid", "Paul Scholes|90|England|Manchester United", "Lothar Matthäus|93|Germany|Inter Milan"
  ],
  AM: [
    "Jesse Lingard|74|England|Manchester United", "Ross Barkley|74|England|Everton", "Adnan Januzaj|72|Belgium|Manchester United", "Josh McEachran|64|England|Chelsea",
    "Ravel Morrison|66|Jamaica|West Ham", "Freddy Adu|62|USA|Benfica", "Marvin Sordell|60|England|Bolton", "Denílson|70|Brazil|Arsenal",
    "Adam Lallana|80|England|Liverpool", "Philippe Coutinho|84|Brazil|Liverpool", "Jack Grealish|82|England|Manchester City", "Christian Eriksen|84|Denmark|Tottenham",
    "Dele Alli|83|England|Tottenham", "Juan Mata|83|Spain|Chelsea", "James Maddison|82|England|Tottenham", "Mason Mount|80|England|Chelsea",
    "Mesut Özil|88|Germany|Arsenal", "Martin Ødegaard|88|Norway|Arsenal", "Bruno Fernandes|87|Portugal|Manchester United", "Florian Wirtz|88|Germany|Bayer Leverkusen",
    "Jamal Musiala|88|Germany|Bayern Munich", "Juan Román Riquelme|89|Argentina|Villarreal", "Rui Costa|89|Portugal|AC Milan", "Gheorghe Hagi|89|Romania|Galatasaray",
    "Wesley Sneijder|89|Netherlands|Inter Milan", "Cole Palmer|86|England|Chelsea", "James Rodríguez|86|Colombia|Real Madrid",
    "Zinedine Zidane|97|France|Real Madrid", "Diego Maradona|99|Argentina|Napoli", "Michel Platini|96|France|Juventus", "Kaká|93|Brazil|AC Milan",
    "Ronaldinho|95|Brazil|Barcelona", "Zico|94|Brazil|Flamengo", "Kevin De Bruyne|92|Belgium|Manchester City"
  ],
  W: [
    "Bebé|55|Portugal|Manchester United", "Gabriel Obertan|63|France|Manchester United", "Andros Townsend|73|England|Crystal Palace", "Stewart Downing|74|England|Liverpool",
    "Jordon Ibe|67|England|Liverpool", "Lazar Marković|67|Serbia|Liverpool", "Matt Jarvis|70|England|Wolves", "Nicolas Pépé|74|Ivory Coast|Arsenal",
    "Ashley Young|74|England|Manchester United", "Adama Traoré|74|Spain|Wolves",
    "Jarrod Bowen|82|England|West Ham", "Wilfried Zaha|83|Ivory Coast|Crystal Palace", "Christian Pulisic|82|USA|AC Milan", "Serge Gnabry|84|Germany|Bayern Munich",
    "Kingsley Coman|84|France|Bayern Munich", "Anthony Gordon|82|England|Newcastle United", "Bryan Mbeumo|82|Cameroon|Brentford", "Theo Walcott|80|England|Arsenal",
    "Harvey Barnes|79|England|Leicester City", "Marcus Rashford|84|England|Manchester United",
    "Bukayo Saka|87|England|Arsenal", "Leroy Sané|86|Germany|Bayern Munich", "Ángel Di María|89|Argentina|Real Madrid", "Gareth Bale|89|Wales|Real Madrid",
    "Khvicha Kvaratskhelia|87|Georgia|Napoli", "Riyad Mahrez|86|Algeria|Manchester City", "Raheem Sterling|87|England|Manchester City", "Raphinha|87|Brazil|Barcelona",
    "Lamine Yamal|88|Spain|Barcelona", "Franck Ribéry|89|France|Bayern Munich",
    "Garrincha|95|Brazil|Botafogo", "George Best|94|Northern Ireland|Manchester United", "Arjen Robben|91|Netherlands|Bayern Munich", "Luís Figo|92|Portugal|Real Madrid",
    "Neymar|93|Brazil|Barcelona", "Eden Hazard|91|Belgium|Chelsea", "Mohamed Salah|91|Egypt|Liverpool", "Lionel Messi|99|Argentina|Barcelona", "Vinícius Júnior|91|Brazil|Real Madrid"
  ],
  ST: [
    "Ali Dia|45|Senegal|Southampton", "Nicklas Bendtner|71|Denmark|Arsenal", "Andy Carroll|74|England|Liverpool", "Emile Heskey|74|England|Liverpool",
    "Wout Weghorst|74|Netherlands|Burnley", "Fraizer Campbell|66|England|Hull City", "Rickie Lambert|73|England|Southampton", "Grant Holt|70|England|Norwich City",
    "Carlton Cole|69|England|West Ham", "Marouane Chamakh|70|Morocco|Arsenal", "Federico Macheda|64|Italy|Manchester United", "Jay Bothroyd|66|England|Cardiff City",
    "Dominic Calvert-Lewin|79|England|Everton", "Ollie Watkins|82|England|Aston Villa", "Gabriel Jesus|83|Brazil|Arsenal", "Jamie Vardy|84|England|Leicester City",
    "Chris Wood|77|New Zealand|Nottingham Forest", "Dominic Solanke|79|England|Tottenham", "Danny Ings|78|England|Southampton", "Olivier Giroud|84|France|Chelsea",
    "Álvaro Morata|83|Spain|Atlético Madrid", "Darwin Núñez|82|Uruguay|Liverpool", "Peter Crouch|77|England|Stoke City",
    "Didier Drogba|89|Ivory Coast|Chelsea", "Sergio Agüero|89|Argentina|Manchester City", "Wayne Rooney|89|England|Manchester United", "Fernando Torres|89|Spain|Liverpool",
    "Gonzalo Higuaín|87|Argentina|Napoli", "Lautaro Martínez|88|Argentina|Inter Milan", "Alexander Isak|87|Sweden|Newcastle United", "Antoine Griezmann|89|France|Atlético Madrid",
    "Radamel Falcao|89|Colombia|Atlético Madrid", "Edinson Cavani|88|Uruguay|Paris Saint-Germain", "Victor Osimhen|87|Nigeria|Napoli",
    "Pelé|99|Brazil|Santos", "Ronaldo Nazário|98|Brazil|Real Madrid", "Cristiano Ronaldo|98|Portugal|Real Madrid", "Marco van Basten|95|Netherlands|AC Milan",
    "Thierry Henry|94|France|Arsenal", "Gerd Müller|94|Germany|Bayern Munich", "Eusébio|95|Portugal|Benfica", "Robert Lewandowski|92|Poland|Bayern Munich",
    "Erling Haaland|92|Norway|Manchester City", "Karim Benzema|91|France|Real Madrid", "Andriy Shevchenko|92|Ukraine|AC Milan", "Luis Suárez|92|Uruguay|Barcelona",
    "Harry Kane|91|England|Tottenham", "Kylian Mbappé|93|France|Real Madrid"
  ]
};
