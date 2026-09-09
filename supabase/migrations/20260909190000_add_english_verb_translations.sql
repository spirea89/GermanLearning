alter table public.verb_game_content
add column english_translation text not null default '';

update public.verb_game_content as verbs
set english_translation = translations.english_translation
from (values
  ('lernen','to learn'),('fahren','to drive; to travel'),('machen','to do; to make'),('sagen','to say'),('brauchen','to need'),
  ('wohnen','to live; to reside'),('kaufen','to buy'),('spielen','to play'),('zeigen','to show'),('fragen','to ask'),
  ('bezahlen','to pay'),('bestellen','to order'),('buchen','to book'),('wünschen','to wish'),('glauben','to believe'),
  ('hoffen','to hope'),('danken','to thank'),('duschen','to shower'),('packen','to pack'),('putzen','to clean'),
  ('kochen','to cook'),('schmecken','to taste'),('passen','to fit; to suit'),('parken','to park'),('tanzen','to dance'),
  ('rauchen','to smoke'),('weinen','to cry'),('lachen','to laugh'),('leben','to live'),('holen','to fetch; to get'),
  ('stellen','to put; to place upright'),('legen','to lay; to put'),('setzen','to set; to seat'),('sparen','to save'),('erzählen','to tell; to narrate'),
  ('besuchen','to visit'),('gehören','to belong'),('verdienen','to earn; to deserve'),('verlangen','to demand; to request'),('versuchen','to try'),
  ('erklären','to explain'),('verletzen','to injure; to hurt'),('warten','to wait'),('arbeiten','to work'),('antworten','to answer'),
  ('kosten','to cost'),('öffnen','to open'),('atmen','to breathe'),('reden','to talk'),('baden','to bathe'),
  ('heiraten','to marry'),('regnen','to rain'),('zeichnen','to draw'),('rechnen','to calculate'),('trocknen','to dry'),
  ('bedeuten','to mean'),('vorbereiten','to prepare'),('sammeln','to collect'),('klingeln','to ring'),('lächeln','to smile'),
  ('wandern','to hike'),('ändern','to change'),('feiern','to celebrate'),('verändern','to alter; to change'),('verbessern','to improve'),
  ('probieren','to try; to taste'),('funktionieren','to work; to function'),('reparieren','to repair'),('organisieren','to organize'),('kontrollieren','to check; to control'),
  ('diskutieren','to discuss'),('informieren','to inform'),('reservieren','to reserve'),('telefonieren','to make a phone call'),('fotografieren','to photograph'),
  ('gratulieren','to congratulate'),('interessieren','to interest'),('freuen','to be pleased; to look forward to'),('fühlen','to feel'),('beeilen','to hurry'),
  ('verabschieden','to say goodbye'),('vorstellen','to introduce; to imagine'),('aufräumen','to tidy up'),('einkaufen','to shop'),('zumachen','to close; to shut'),
  ('aufmachen','to open'),('aufhören','to stop'),('kennenlernen','to get to know'),('gehen','to go'),('kommen','to come'),
  ('sehen','to see'),('geben','to give'),('nehmen','to take'),('lesen','to read'),('essen','to eat'),
  ('sprechen','to speak'),('helfen','to help'),('treffen','to meet'),('werfen','to throw'),('sterben','to die'),
  ('vergessen','to forget'),('empfehlen','to recommend'),('lassen','to let; to leave'),('schlafen','to sleep'),('tragen','to carry; to wear'),
  ('fallen','to fall'),('halten','to hold; to stop'),('laufen','to run; to walk'),('waschen','to wash'),('wachsen','to grow'),
  ('schlagen','to hit; to beat'),('fangen','to catch'),('raten','to advise; to guess'),('laden','to load; to invite'),('bleiben','to stay'),
  ('schreiben','to write'),('bieten','to offer'),('bitten','to ask; to request'),('fliegen','to fly'),('verlieren','to lose'),
  ('schließen','to close'),('genießen','to enjoy'),('gießen','to pour; to water'),('riechen','to smell'),('fließen','to flow'),
  ('beweisen','to prove'),('scheinen','to seem; to shine'),('steigen','to climb; to rise'),('schweigen','to remain silent'),('entscheiden','to decide'),
  ('unterscheiden','to distinguish'),('leiden','to suffer'),('schneiden','to cut'),('reiten','to ride'),('streiten','to argue'),
  ('finden','to find'),('binden','to bind; to tie'),('trinken','to drink'),('singen','to sing'),('springen','to jump'),
  ('beginnen','to begin'),('gewinnen','to win'),('schwimmen','to swim'),('sitzen','to sit'),('liegen','to lie; to be located'),
  ('rufen','to call; to shout'),('stoßen','to push; to bump'),('verbieten','to forbid'),('verlassen','to leave'),('gefallen','to please; to appeal to'),
  ('erfahren','to learn; to find out'),('entstehen','to arise; to develop'),('enthalten','to contain'),('verstehen','to understand'),('ziehen','to pull; to move'),
  ('aufstehen','to get up'),('anfangen','to begin; to start'),('ankommen','to arrive'),('aussehen','to look; to appear'),('mitkommen','to come along'),
  ('anrufen','to call by phone'),('fernsehen','to watch television'),('einladen','to invite'),('wegfahren','to drive away; to leave'),('ausgehen','to go out'),
  ('zurückkommen','to come back'),('umziehen','to move house; to change clothes'),('anziehen','to put on; to dress'),('ausziehen','to take off; to move out'),('einsteigen','to get in; to board'),
  ('aussteigen','to get out; to disembark'),('umsteigen','to change trains; to transfer'),('vorschlagen','to suggest'),('teilnehmen','to participate'),('zunehmen','to gain; to increase'),
  ('abnehmen','to lose weight; to decrease'),('mitnehmen','to take along'),('zurückgeben','to give back; to return'),('stattfinden','to take place'),('bringen','to bring'),
  ('denken','to think'),('kennen','to know; to be familiar with'),('nennen','to name; to call'),('rennen','to run'),('brennen','to burn'),
  ('wissen','to know a fact'),('erkennen','to recognize'),('senden','to send'),('wenden','to turn'),('verbringen','to spend time'),
  ('mitbringen','to bring along'),('können','can; to be able to'),('müssen','must; to have to'),('dürfen','may; to be allowed to'),('sollen','should; to be supposed to'),
  ('wollen','to want'),('mögen','to like'),('sein','to be'),('haben','to have'),('werden','to become; will'),('tun','to do')
) as translations(infinitive, english_translation)
where verbs.infinitive = translations.infinitive;

alter table public.verb_game_content
add constraint verb_game_content_translation_required check (char_length(trim(english_translation)) between 1 and 160);
