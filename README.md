# NEXUS CLASH · Ultimate Arena — v6

**Jugar en el navegador:** https://jesusuc18.github.io/nexus-clash/

Juego de lucha de plataformas 2D en HTML5 Canvas + JavaScript ES6+, sin imágenes externas.
Reglamento por defecto: **3 vidas · 7:00 · sin objetos** (configurable en REGLAS). 32 luchadores originales, 5 escenarios competitivos
y bots de nivel 1 a 9.

## Novedades v6 — 2 luchadores nuevos (32 en total)
- **Corvin, Estratega Arcano** — táctico con tomo y espada rúnica (kit tipo Robin). Sus hechizos gastan
  **MANÁ**, que se regenera solo:
  - **Trueno** (neutral): mantén B para cargar 4 niveles — Rayo, Rayo+ (estalla), Megarrayo (atraviesa) y
    Gigarrayo (golpes múltiples y explosión final). **Escudo** guarda la carga.
  - **Fuego Arcano** (lateral): bola de fuego que deja un **pilar de llamas** en el suelo.
  - **Ventisca Doble** (arriba): dos cuchillas de viento hacia abajo que lo impulsan dos veces.
  - **Sangría** (abajo): agarre mágico que daña al rival y **le cura** a él.
  - Smashes y aéreos con la espada eléctrica.
- **Gyron-64, Centinela Retro** — robot de juguete sin piernas que rueda sobre su base (kit tipo R.O.B.):
  - **Láser Óptico** (neutral): se recarga solo (los ojos se iluminan); a carga completa rebota en el
    escenario. Inclina ↑/↓ para apuntar.
  - **Rotor de Brazos** (lateral): giro de golpes múltiples que **refleja proyectiles** y en el aire lo eleva.
  - **Propulsores** (arriba): vuela mientras mantengas B y quede **COMBUSTIBLE**; se recarga en el suelo.
  - **Peonza Giro** (abajo): cárgala y suéltala; rueda por el suelo, rebota en paredes y rivales.
- El renderizador admite luchadores sin piernas (`rig.legs: false`).

## Novedades v5 — teléfono y tablet
- **Detección automática del dispositivo.** En laptop/PC se juega con teclado o gamepad como siempre; en
  teléfono o tablet aparecen los **controles táctiles**. En una laptop con pantalla táctil basta con tocar
  la pantalla para que aparezcan, y vuelven a ocultarse al usar el teclado o un gamepad.
- **Controles táctiles**: joystick flotante en la mitad izquierda (aparece bajo tu pulgar; a medias =
  caminar, arriba = saltar) y botones **A** ataque, **B** especial, **▲** salto, **S** smash, **◆** escudo y
  **✊** agarre a la derecha, más **❚❚** pausa arriba a la izquierda. Admite varios dedos a la vez.
- El HUD sube a la parte superior en modo táctil para dejar libres los pulgares.
- Aviso para girar el teléfono a horizontal, pantalla completa al empezar (donde el navegador lo permite)
  y menús adaptados a pantallas bajas.
- Nueva opción en **REGLAS → CONTROLES TÁCTILES**: AUTO (por defecto), SÍ o NO.

## Novedades v4 — ataques renovados
- **Normales únicos para cada luchador.** Antes los 30 compartían los ataques de su arquetipo; ahora
  cada uno (y cada forma de Nia y de Sol y Luna) tiene su propio jab, tilts, smashes, aéreos y ataque
  en carrera, elegidos de una biblioteca de ~55 ataques (`js/fighters/kits.js`): combos de 3 golpes,
  ráfagas de golpes rápidos (mantén o machaca J), patadas giratorias, mazazos al suelo con polvo y
  temblor, ráfagas mágicas, estocadas, mortales, ruedas, picados que clavan hacia abajo, taladros
  de varios golpes…
- Los clones de Ultimate imitan sus normales: Haldor (mandoble pesado, tajo hacia abajo), Ilyra y Aria
  (arcos de espada; el smash arriba de Aria es una estocada vertical), Kestra (patadas, disparos y
  pisotón de cañón), Tamba (palmada frontal, golpe doble que clava), Kael (ráfagas psíquicas) y
  Volgur (martillazos).
- **Animación por fotogramas clave**: cada ataque pasa por anticipación, impacto con inercia, pose
  sostenida y recuperación suave, en lugar de saltar entre dos poses. Los especiales también ganan
  rebote e inercia.
- **Estelas de movimiento** en el puño, el pie o el arma que golpea, que siguen giros y mortales.

## Novedades v3.1
- **4 luchadores nuevos** (30 en total), con aspecto y nombre propios:
  - **Haldor, Mercenario del Alba** — mandoble pesado. Erupción cargable (al máximo le cuesta 10%),
    Tajo Relámpago cargable (gran recuperación horizontal), Éter (lanza la espada, sube a por ella y
    cae arrastrando al rival) y Contraataque.
  - **Ilyra, Princesa Enmascarada** — esgrimista sin punta especial: toda la hoja golpea igual.
    Rompeescudos cargable (al máximo rompe un escudo lleno), Danza de Hojas de 4 golpes (en cada golpe
    elige ↑, → o ↓), Tajo del Delfín (invulnerable al inicio) y Contraataque.
  - **Kestra, Cazadora Orbital** — exotraje con cañón. Disparo Cargado almacenable (Escudo lo guarda),
    misiles (mantén la dirección = teledirigido; pulsa dirección + K a la vez = súper misil recto),
    Barrena en Espiral (arrastra en varios golpes), Bomba de esfera (máx. 3; te impulsa si estás en el
    aire) y agarre de rayo de largo alcance.
  - **Tamba, Titán de la Selva** — simio superpesado. Puñetazo Gigante almacenable (al máximo tiene
    superarmadura), Cabezazo que entierra (y clava hacia abajo en el aire), Kong Giratorio (recuperación
    horizontal) y Palmada al suelo (mantén K para seguir). Su lanzamiento hacia delante es una **carga**:
    levanta al rival, camina y salta con él y lo lanza en la dirección que elijas.
- **Descarga del .zip protegida con contraseña** desde el menú principal (se pide una vez por sesión).

## Novedades v3
- **Pantalla REGLAS** (menú principal, o botón ⚙ / tecla **R** en la selección): vidas de 1 a 9, tiempo de
  1 a 10 minutos o ∞ (sin límite), música y narrador. Se guardan en el navegador. El HUD muestra las vidas
  (×N si son más de 5) y el cronómetro ∞ cuenta hacia arriba.
- **2 escenarios nuevos**: Muelle Celeste (plataforma móvil que cruza el escenario) y Pico Escarchado
  (dos bajas laterales y una alta central, con aurora y nieve).
- **2 luchadores multiforma** (cada uno ocupa un solo slot; **Abajo + K** cambia de forma):
  - **Nia, Domadora de Bestias**: dirige a 3 bestias desde el fondo del escenario — Brisa (ligera y rápida),
    Terro (equilibrada) y Rescoldo (pesada). Al perder una vida sale la siguiente bestia.
  - **Sol y Luna, Espadas del Eclipse**: Sol (potencia, espada que se lanza y vuelve) y Luna (velocidad,
    teletransporte cortante y *Previsión*: esquivar justo antes de un golpe ralentiza a los rivales).
- Tarjetas de selección con la descripción de la pasiva y marca ⇄ en los luchadores multiforma.

## Novedades v2
- 8 luchadores nuevos (24 en total), entre ellos **Kael** (cañón de cristal flotante: orbe cargable y
  almacenable, desvío que refleja y voltea al rival, teletransporte y mirada paralizante) y **Volgur**
  (superpesado con 4 saltos: fuelle que inhala rivales y proyectiles, bola de púas que rebota, gran salto
  con caída aplastante y martillo de vapor cargable).
- Veneno (daño continuo), rayos encadenados, imán, campo de ralentización temporal y muro-escudo.
- Colores alternativos automáticos cuando se repite un luchador.

## Cómo ejecutarlo
1. Descomprime `nexus-clash.zip`.
2. Abre la carpeta `nexus-clash` y haz **doble clic en `index.html`**. Se abre en tu navegador
   (Chrome, Edge, Firefox o Safari recientes). No hace falta instalar nada ni usar un servidor.
3. Pulsa **Enter** (o haz clic) en la pantalla de título, elige modo, luchador, escenario y ¡a pelear!

Opcional, si prefieres servirlo por HTTP (por ejemplo, para editar archivos y que el botón ZIP use
tus cambios): abre una terminal en la carpeta y ejecuta `python -m http.server 8000`, luego entra en
`http://localhost:8000`.

Notas: las fuentes se cargan desde Google Fonts (sin internet se usan fuentes de respaldo). El audio
se activa tras la primera tecla o clic, como exigen los navegadores. Pulsa **M** para silenciar.

## Modos
- **1 VS 1**: tú contra un CPU. Ajusta su nivel (1–9) con los botones − / + de su tarjeta.
- **Batalla Campal**: tú contra 3 CPUs, todos contra todos, cada uno con su propio nivel.
- **Descargar .ZIP**: empaqueta todo el proyecto. Usa JSZip desde CDN y, sin conexión, un
  compresor ZIP propio integrado.

En la selección de personaje arrastra las fichas (P1 / CPU) sobre los retratos, o usa las flechas
y Enter. Esc vuelve atrás.

## Controles
| Acción | Teclado | Gamepad | Táctil |
|---|---|---|---|
| Mover | WASD o Flechas (Shift = caminar) | Stick izq. / D-Pad | Joystick (a medias = caminar) |
| Saltar / doble salto | Espacio o W/↑ | X / Y | ▲ o joystick arriba |
| Caída rápida | ↓ en el aire | Stick ↓ | Joystick ↓ |
| Ataque normal, tilts, aéreos | J (+ dirección) | A | A (+ joystick) |
| Smash cargable | U + dirección (mantén para cargar) | RT o stick derecho | S + joystick (mantén) |
| Especiales (neutral, lateral, arriba, abajo) | K (+ dirección) | B | B (+ joystick) |
| Escudo / esquivas / esquiva aérea | L (+ dirección) | LB / LT | ◆ (+ joystick) |
| Agarre (luego dirección = lanzar, J = golpear) | I | RB | ✊ |
| Cambiar de forma (Nia, Sol y Luna) | ↓ + K | ↓ + B | Joystick ↓ + B |
| Reglas (en la selección) | R | — | Botón ⚙ REGLAS |
| Pausa | Esc o P | Start | ❚❚ |

## Escenarios (Parte 3)
| Escenario | Diseño |
|---|---|
| Ciudadela Trina | Principal + 3 plataformas en triángulo, atardecer con islas flotantes |
| Abismo Estelar | Plataforma plana competitiva, espacio profundo animado |
| Santuario Gemelo | Principal + 2 plataformas laterales, noche de luna con farolillos |
| Muelle Celeste (v3) | Principal + 1 plataforma móvil, puerto aéreo con globos |
| Pico Escarchado (v3) | Principal + 2 bajas laterales + 1 alta central, aurora y nieve |

## IA de los bots (Parte 3)
Máquina de estados: recuperación prioritaria (orientarse al borde, doble salto y Up-B), borde,
perseguir, espaciar, atacar, escudar/contraatacar, evadir proyectiles, guardia de borde, agarres y
lanzamientos, DI y tech. En Batalla Campal cada bot elige objetivo dinámicamente (el más cercano o
con más daño). El nivel ajusta tiempo de reacción, agresividad, defensa y precisión.

## Estructura
```
index.html
css/styles.css
js/main.js                 Bucle de paso fijo a 60 FPS y gestor de estados
js/engine/physics.js       Gravedad, fricción, AABB, pass-through, ledges, knockback
js/engine/input.js         Teclado + Gamepad
js/engine/touch.js         Detección de dispositivo + controles táctiles (v5)
js/engine/audio.js         Sintetizador Web Audio + narrador SpeechSynthesis
js/engine/combat.js        Hitboxes, escudos, agarres, proyectiles, efectos, relámpago de KO
js/engine/renderer.js      Sprites vectoriales procedurales
js/engine/fighter.js       Máquina de estados del luchador + moveset estándar
js/engine/camera.js        Cámara dinámica
js/engine/match.js         Reglas, KOs, muerte súbita, colores alternativos
js/engine/ai.js            Bots (Parte 3)
js/fighters/kits.js        Biblioteca de ataques normales y kit de cada luchador (v4)
js/fighters/roster.js      32 luchadores (Partes 2, v2, v3, v3.1 y v6)
js/stages/stages.js        3 escenarios (Parte 3)
js/tools/packager.js       Botón de descarga ZIP (Parte 3)
js/tools/bundle.js         Copia de las fuentes para el ZIP (generada)
js/ui/hud.js, js/ui/menus.js
```

## Plantel
| # | Luchador | Arquetipo | Peso | Neutral | Lateral | Arriba | Abajo |
|---|---|---|---|---|---|---|---|
| 1 | Gorrak, Coloso de Roca | Superpesado · pasiva −10% daño | 138 | Peñasco (estalla en esquirlas) | Carga de Hombro (armadura) | Pilar Géiser | Terremoto / caída aplastante |
| 2 | Vespera, Bruja Lunar | Flotante · levitación | 80 | Orbe Lunar cargable | Enjambre de Polillas | Ascenso Creciente | Runa Maldita (trampa) |
| 3 | Ironclad, Ogro Mecánico | Superpesado · 3 saltos | 128 | Remachadora (ráfaga) | Bola de Demolición | Cohete Propulsor direccional | Purga de Vapor (quema) |
| 4 | Rook, Ingeniera de Chatarra | Constructora · medidor CHATARRA | 92 | Pistola de Clavos | Muro Exprés (bloque/plataforma) | Mochila Hélice | Torreta automática |
| 5 | Kaito Ren, Puño de Jade | Equilibrado | 98 | Pulso de Jade | Paso del Dragón | Patada Espiral | Postura de Hierro (counter) |
| 6 | Sylra, Guardabosques Espinosa | Zoner | 90 | Semilla Bomba (zarzal) | Látigo de Liana (atrae / agarra bordes) | Catapulta de Brote | Zarzal |
| 7 | Nyx, Gata Sombra | Ligera y veloz | 76 | Shuriken Doble | Corte Sombrío (intangible) | Salto Gancho doble | Bomba de Humo (invisibilidad) |
| 8 | Medu, Medusa Abisal | Flotante · 3 saltos | 74 | Burbuja Urticante | Latigazo Tentáculo | Pulso de Chorro x3 | Nube de Tinta |
| 9 | Valkyr-7, Guardiana Autómata | Zoner pesada | 108 | Mortero de Arco | Embestida de Escudo (refleja) | Uppercut Propulsado | Domo Barrera (refleja) |
| 10 | Jett, Piloto Ígnea | Rushdown de caída rápida | 82 | Cohete Mini | Postquemador | Salto Turbina | Bengala Cegadora (aturde) |
| 11 | Grizzla, Osa Luchadora | Grappler | 125 | Abrazo de Oso (agarre de comando) | Lariat Giratorio | Salto Zarpazo | Panzazo |
| 12 | Zephyr, Liebre del Vendaval | El más rápido | 84 | Cuchilla de Viento | Embestida Ciclón | Corriente Ascendente | Muro de Viento (empuja y refleja) |
| 13 | Aria Solenne, Espada Resonante | Espadachina · medidor RESONANCIA | 95 | Eco Perforante | Vals Triple (3 cortes) | Aria Ascendente | Parada Resonante (counter) |
| 14 | Morgrath, Segador Espectral | Guadaña de largo alcance | 82 | Orbe de Almas (teledirigido) | Arco Segador (atrae) | Ascenso Fantasmal | Manos Sepulcrales / tajo meteórico |
| 15 | Brakk, Gladiador de Hierro | Brawler · pasiva de combo | 115 | Arranque de Tierra | Puño Ariete (armadura) | Uppercut Cohete | Cuerpo de Hierro (absorbe y devuelve) |
| 16 | Luma, Farolera de Ascuas | Invocadora · medidor LLAMA | 90 | Fuego Fatuo Errante | Golpe de Farol (quema) | Ascenso de Brasas | Custodia de Llama (absorbe) |
| 17 | Kael, Mente Psiónica | Flotante, cañón de cristal · orbe almacenable | 79 | Orbe del Vacío (cargable y almacenable con Escudo) | Desvío Mental (refleja y voltea al rival) | Salto Etéreo (teletransporte direccional) | Mirada Paralizante (aturde si te mira) |
| 18 | Volgur, Señor de la Forja | Superpesado · 4 saltos | 127 | Fuelle Voraz (inhala rivales/proyectiles y escupe) | Bola de Púas (rebota) | Gran Salto Aplastante (Escudo cancela) | Martillo a Vapor (cargable, se puede caminar) |
| 19 | Chronia, Relojera del Tiempo | Control de tiempo | 86 | Burbuja Temporal (ralentiza) | Agujas del Reloj | Rebobinar (vuelve a su posición pasada) | Pausa (aturde en área) |
| 20 | Hexa, Caballero Avispa | Lanza · veneno · 3 saltos | 84 | Dardo Venenoso | Picada | Vuelo Zumbante (dirigible) | Enjambre (drones teledirigidos) |
| 21 | Kumo, Acechadora Arácnida | Trampas · rushdown | 80 | Telaraña (aturde) | Hilo Tirador (se lanza al rival / agarra bordes) | Rapel | Trampa de Seda |
| 22 | Ritmo, Bailarín de Capoeira | Combos · pasiva Ginga | 88 | Media Luna | Rasteira | Parafuso | Bananeira |
| 23 | Volta, Inventora Galvánica | Electricidad | 90 | Rayo Encadenado (salta entre rivales) | Imán (atrae y descarga) | Propulsión Galvánica | Sobrecarga |
| 24 | Torva, Baluarte | Escudo torre · bloquea proyectiles | 112 | Jabalina | Carga de Lanza (armadura) | Ascenso de Bastión | Muralla (muro sólido) / golpe meteórico |
| 25 | Nia, Domadora de Bestias | Multiforma (3 bestias) | 72 / 100 / 128 | Ráfaga · Roca Lanzada · Géiser de Magma | Embestida Veloz · Rodada · Carga de Cuerno | Remolino · Pilar de Tierra · Erupción | Cambiar de bestia |
| 26 | Sol y Luna, Espadas del Eclipse | Multiforma (2 espadachinas) | 98 / 86 | Nova Solar (cargable) · Ráfaga Estelar | Filo Errante (vuelve) · Destello Fotónico | Revuelta Solar · Juicio Celeste | Cambiar de espada |
| 27 | Haldor, Mercenario del Alba | Mandoble pesado | 107 | Erupción (cargable) | Tajo Relámpago (cargable) | Éter | Contraataque ×1.2 |
| 28 | Ilyra, Princesa Enmascarada | Esgrima · daño uniforme | 90 | Rompeescudos (cargable) | Danza de Hojas (4 golpes) | Tajo del Delfín | Contraataque ×1.2 |
| 29 | Kestra, Cazadora Orbital | Zoner · cañón · agarre de rayo | 108 | Disparo Cargado (almacenable) | Misil / Súper Misil | Barrena en Espiral | Bomba de esfera |
| 30 | Tamba, Titán de la Selva | Superpesado · carga | 127 | Puñetazo Gigante (almacenable) | Cabezazo (entierra) | Kong Giratorio | Palmada al suelo |
| 31 | Corvin, Estratega Arcano | Táctico · medidor MANÁ | 95 | Trueno (4 niveles, almacenable) | Fuego Arcano (pilar de llamas) | Ventisca Doble | Sangría (roba vida) |
| 32 | Gyron-64, Centinela Retro | Robot sobre ruedas · COMBUSTIBLE | 106 | Láser Óptico (se recarga) | Rotor de Brazos (refleja) | Propulsores (vuelo) | Peonza Giro (cargable) |

Con el medidor lleno: Aria potencia su siguiente especial ("Crescendo") y Luma invoca al espíritu Fuego Fatuo durante 12 s.
