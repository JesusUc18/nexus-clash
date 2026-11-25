# NEXUS CLASH · Ultimate Arena — V1.3

### ▶ Jugar ahora: https://jesusuc18.github.io/nexus-clash/

Juego de lucha de plataformas 2D en HTML5 Canvas + JavaScript, sin imágenes externas para los personajes.
Funciona en **laptop/PC** (teclado o gamepad) y en **teléfono o tablet** (controles táctiles), sin instalar nada.
**36 luchadores originales**, 5 escenarios competitivos, modos **1 VS 1**, **Batalla Campal**, **Horda** y **Práctica**, y bots
de nivel 1 a 9. Reglamento por defecto: 3 vidas · 7:00 · sin objetos (configurable en REGLAS).

> Consejo para teléfono: juega en horizontal. En Android puedes usar *Agregar a la pantalla principal* y se abre
> como una app a pantalla completa.

## V1.3 — Luchadores rediseñados
- **Motor de dibujo** (`js/engine/renderer.js`): extremidades con volumen (sombra y brillo según una luz arriba-adelante) que se
  afinan del hombro a la mano y del muslo al pie; cuello; torso y cabeza con degradados de luz; manos con brillo; zapatos con
  suela; hebilla en los cinturones; rubor en caras de piel; armas con pomo, vendas, guarda curva, canal y destello.
- **Ojos** con iris, pupila, dos brillos y párpado; **parpadean** cada pocos segundos.
- **Sombra de contacto** bajo cada luchador que se encoge y se aclara al saltar (`js/engine/fighter.js`).
- **Detalles por luchador** (`js/fighters/details.js`): texturas, costuras, remaches, emblemas, brillos de pelo y lentes y
  efectos animados (el reloj de Chronia marca la hora real, las botas de Jett echan fuego, chispas de Volta, burbujas de Medu…).
  Monocromo se mantiene plano (silueta LCD; `rig.flat` o `def.lcd` desactivan el sombreado).
- Sin cambios de estadísticas: la Tier List sigue igual.

## V1.2.1 — Ajustes de balance
- **Jochis**: Arcano Mayor al sobrevivir **1:00** (antes 1:30).
- **BigSimio**: Simio Molesto desde **100%** (antes 110%).
- **Torva**: **+10% de alcance** en los normales (perfil 1.2 → 1.32).
- **Kestra**: disparo cargado al máximo **24%** (antes 28%).
- **LosGemelos · Copete**: el Píxel Cargado viaja **~35% menos** (vida del proyectil 80 → 52 fotogramas).
- **Tier List recalculada**: Jochis A → **A+**, LosGemelos A → **A−**, Torva pasa a encabezar S−, BigSimio encabeza S+
  y Kestra queda al final de B− (la tabla de la V1.2 ya muestra la clasificación actual).

## V1.2 — Tier List oficial, modo Práctica y panel de novedades
- **PRÁCTICA** (menú principal): elige tu luchador y el del muñeco; el muñeco **no se mueve ni ataca** (no tiene
  IA). Vidas y tiempo infinitos. El HUD muestra el **combo** en curso (golpes y daño), el último y el mejor; al
  terminar un combo de 2 golpes o más aparece "COMBO ×N · X%" sobre el muñeco. Se cuenta como combo cada golpe
  que llega mientras el muñeco sigue aturdido por el anterior. En la pausa: **REINICIAR POSICIONES (0%)** y
  **CAMBIAR LUCHADORES**.
- **TIER LIST** (REGLAS → TIER LIST): los 36 luchadores clasificados de **S+** a **E**, agrupados por letra como
  las tier lists clásicas. Se armó con las estadísticas reales del motor más el valor del kit:
  DPS (daño ÷ fotogramas de arranque) 22% · daño 14% · velocidad de reacción 10% · peso 16% · movilidad 12% ·
  alcance 8% · kit (proyectiles, reflectores, contraataques, recuperación y pasiva) 18%.

  | Tier | Luchadores |
  |------|------------|
  | S+ | BigSimio · Tamba · Brakk |
  | S− | Torva · Ilyra · Haldor · Sol y Luna |
  | A+ | Gorrak · Valkyr-7 · Jochis · Ironclad · Aria Solenne |
  | A  | Zephyr · Morgrath · Hexa · Volgur |
  | A− | Ritmo · LosGemelos · Corvin · Kaito Ren · Kael |
  | B+ | Grizzla · Sylra · Rook · Chronia · Nia |
  | B− | Gyron-64 · Luma · Jett · Kestra |
  | C+ | Vespera · Volta |
  | C− | Monocromo |
  | D  | Kumo · Nyx |
  | E  | Medu |
- Cada luchador tiene una **ficha**: barras de DAÑO, REACCIÓN, PESO, MOVILIDAD y ALCANCE (calculadas en vivo
  desde sus movimientos), su pasiva y por qué está en ese puesto. El botón **LUCHAR CON…** abre 1 VS 1 con ese
  luchador ya elegido.
- **NOVEDADES**: al entrar al menú principal tras una actualización aparece un panel con los cambios de la
  versión (y pestañas con las anteriores). Sale una sola vez por versión; se puede volver a abrir en
  REGLAS → NOVEDADES.
- Para publicar una versión nueva: cambia `NX.VERSION`, añade la entrada al principio de `NX.CHANGELOG` en
  `js/ui/changelog.js` y ejecuta `npm run build` (ver **Desarrollo**). La clasificación está en `js/ui/tierlist.js` (un luchador nuevo que aún no esté en la
  lista aparece en una fila "NUEVOS").

## V1.1 — BigSimio y Jochis (36 en total)
- **BigSimio, Simio del Termo** — pesado, lento y con mucho daño. Grande, con suéter blanco, lentes y cabello
  negro peinado hacia delante. Sus normales son **termazos con un termo negro** y sus especiales usan **bananas**:
  - **Racimo Explosivo** (neutral): cargable; lanza un racimo en arco que estalla en 3 bananas.
  - **Cáscara Traicionera** (lateral): deja hasta 2 cáscaras en el suelo; el rival que las pisa **resbala**.
  - **Banana Cohete** (arriba): sube montado en una banana gigante (dirigible) con golpes múltiples.
  - **Pisotón Platanero** (abajo): golpe al suelo con ondas a ambos lados; en el aire cae en picado.
  - Pasiva **Simio Molesto**: a partir de **110%** se enfurece hasta perder la vida — partículas y símbolo de
    enojo, tono rojizo, **+15% de velocidad** y **+15% de daño**. Su medidor RABIA muestra cuánto falta.
- **Jochis, Tarotista Gamer** — ligero, velocidad media y buen daño. Pequeño, con camisa café, lentes y cabello
  negro. Sus normales son golpes con un **mando rosa estilo consola** y sus especiales usan **cartas de tarot**:
  - **Tirada de Tarot** (neutral): saca un arcano al azar — El Sol (bola de fuego), La Luna (orbe
    teledirigido), La Torre (rayo sobre el rival), La Estrella (se cura 8% y lanza estrellas), La Muerte (tajo
    devastador, poco común) o El Loco (le estalla en la cara).
  - **Rueda de la Fortuna** (lateral): rueda giratoria de varios golpes que frena y estalla.
  - **El Carro** (arriba): sube en diagonal montado en una carta gigante.
  - **La Justicia** (abajo): contraataque que devuelve el golpe ×1.3.
  - Pasiva **Arcano Mayor**: si sobrevive **1:30** sin perder la vida gana **+25% de alcance** y **+30% de peso**
    (dos cartas orbitan a su alrededor). El medidor AGUANTE marca la cuenta atrás.

## V1.0 — versión oficial (UX/UI)
- **Portada nueva** con el sello V1.0 y un desfile de los 34 luchadores.
- **Selección de personajes** más clara: cuadrícula compacta con los nombres completos y el aviso
  "¡LISTOS PARA LUCHAR!" en la parte de abajo, sin tapar a los luchadores elegidos.
- **Escenarios** que siempre caben en pantalla, con el nombre bajo cada imagen.
- **Controles**: en teléfono se muestra un mapa de los botones táctiles y solo la columna táctil; en laptop,
  teclado y gamepad. El botón VOLVER ya no tapa la tabla.
- **Teléfono**: HUD compacto y legible con 4 jugadores, la cámara deja espacio bajo el HUD, botón de pausa
  rediseñado, textos de "GO!" más pequeños y resultados con el ganador y su celebración.
- **Al compartir el enlace** (WhatsApp, Discord, etc.) aparece una imagen de vista previa con los luchadores.
- **Ícono propio** y soporte para instalarlo en el celular (pantalla completa y horizontal).

## Novedades v8 — modo HORDA
- **HORDA** (menú principal): elige luchador y escenario; en cuanto empieza la partida aparece un
  **rival aleatorio**. Al derrotarlo llega otro, y así hasta la **oleada 10**. Sin límite de vidas ni de
  tiempo: el objetivo es terminar **en el menor tiempo posible**.
  - El cronómetro cuenta hacia arriba; el nivel de los bots sube con cada oleada (2 → 9) y no se repiten
    rivales seguidos.
  - **Oleada 10 · JEFE FINAL**: rival aleatorio un 30% más grande, más pesado, con más resistencia
    (recibe un 35% menos de daño) y más daño (+30%), envuelto en un aura de **partículas moradas**.
  - Al terminar se muestra el tiempo final, las caídas y el daño, y se guarda tu **récord** en el navegador
    (aparece en el mosaico de HORDA).
- El botón de **descarga .ZIP** ahora es un botón pequeño en la esquina del menú principal.

## Novedades v7 — Monocromo y LosGemelos (34 en total)
- **Monocromo, Hombre LCD** (kit tipo Mr. Game & Watch): silueta negra plana de cristal líquido que se
  mueve **a saltos de fotograma** y hace pitidos en cada ataque. Ligero y flotante.
  - **Sartén** (neutral): lanza comida en arco (salchicha, pescado o huevo).
  - **Juez** (lateral): martillo con un número al azar del **1 al 9**. El 1 le hace daño a él; el 9 es un
    golpe devastador; el 5 electrocuta, el 6 quema y el 8 moja.
  - **Trampolín** (arriba): dos bomberos lo lanzan muy alto y cae despacio; puede seguir atacando.
  - **Cubo** (abajo): absorbe **3 proyectiles**; con el cubo lleno vierte aceite ardiente (golpe muy fuerte).
- **LosGemelos, Dúo Gamer** (original, dos en uno como Pyra/Mythra). Ambos con **camisa azul rey** y
  **lentes**; cambian el pantalón y el peinado. **Abajo + B** cambia de gemelo.
  - **Copete** (copete de mango chupado, pantalón negro, tenis blancos): normales a **gritos** (ondas de
    sonido, "¡AAAAH!" en los smashes). Especiales con su **consola portátil**: Píxel Cargado (cargable),
    Joy-Bumerán (lanza los dos controles, que regresan) y Salto Turbo (sube golpeando y cae en picado).
  - **Flequillo** (flequillo de lado, pantalón caqui): normales con su **laptop**. Especiales con
    **cartas coleccionables** de fuego, agua, rayo o planta: Abanico de Cartas (3 cartas), Carta Veloz
    (embestida) y Carta Gigante (sube sobre una carta y lanza 3 hacia abajo). Más rápido.

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
- **Horda**: 10 oleadas de rivales aleatorios contra reloj, con jefe final en la oleada 10.
- **⬇ .ZIP** (botón pequeño arriba a la derecha del menú): empaqueta todo el proyecto. Usa JSZip desde CDN y, sin conexión, un
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
js/fighters/details.js     Capas de detalle visual de cada luchador (V1.3)
js/fighters/lib.js         Utilidades compartidas del plantel (proyectiles, accesorios, contraataque, cambio de forma)
js/fighters/roster/NN-id.js  Un archivo por luchador (01-gorrak.js … 36-jochis.js)
js/stages/stages.js        5 escenarios
js/tools/packager.js       Botón de descarga ZIP (Parte 3)
js/tools/bundle.js         Copia de las fuentes para el ZIP (generada por `npm run build`)
js/ui/changelog.js         Versión actual y panel de NOVEDADES (V1.2)
js/ui/tierlist.js          Tier List oficial y barras de estadísticas (V1.2)
js/ui/hud.js, js/ui/menus.js
tools/                     Herramientas de desarrollo en Node (no se cargan en el juego)
```

## Desarrollo
El juego no tiene paso de compilación: GitHub Pages sirve los archivos tal cual y también se puede abrir con doble
clic en `index.html`. Las herramientas de `tools/` solo necesitan **Node 18+** (sin `npm install`):

| Comando | Qué hace |
|---|---|
| `npm test` | Sintaxis, integridad del plantel/Tier List/changelog, una partida de bots por luchador en cada modo y la **huella dorada** |
| `npm run build` | Copia `NX.VERSION` a los títulos de `index.html`, añade `?v=<hash>` a cada script/estilo (evita mezclar archivos viejos en caché tras publicar) y regenera `js/tools/bundle.js` |
| `npm run golden:update` | Acepta como nueva referencia el comportamiento actual (solo tras un cambio de balance **intencionado**) |
| `npm run serve` | Servidor local en `http://localhost:8000` |

- **Huella dorada** (`tools/golden.mjs`): 46 partidas de bots con semilla fija; si un cambio altera el resultado de
  alguna, la prueba falla. Una refactorización no debe cambiarla; un ajuste de balance sí, y entonces se actualiza.
- **Simulador** (`tools/sim.mjs`): carga el motor real en Node sin navegador (`node tools/sim.mjs`).
- **CI** (`.github/workflows/ci.yml`): en cada push a `main` y en cada pull request comprueba que `index.html` y
  `bundle.js` estén al día y ejecuta `npm test`.
- **Luchador nuevo**: crea `js/fighters/roster/37-id.js` (copia uno parecido), añade su `<script>` en `index.html`
  después del 36, ponlo en `js/ui/tierlist.js` y ejecuta `npm run build && npm test`.
- **Versión nueva**: cambia `NX.VERSION`, añade la entrada a `NX.CHANGELOG` (`js/ui/changelog.js`) y ejecuta
  `npm run build`.

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
| 33 | Monocromo, Hombre LCD | Silueta LCD · ligero · medidor CUBO | 75 | Sartén (comida en arco) | Juez (número 1–9) | Trampolín | Cubo (absorbe 3 y vierte aceite) |
| 34 | LosGemelos, Dúo Gamer | Multiforma (2 gemelos) | 94 / 88 | Píxel Cargado · Abanico de Cartas | Joy-Bumerán · Carta Veloz | Salto Turbo · Carta Gigante | Cambiar de gemelo |
| 35 | BigSimio, Simio del Termo | Pesado · termo · pasiva Simio Molesto (100%) | 132 | Racimo Explosivo (cargable) | Cáscara Traicionera (trampa) | Banana Cohete | Pisotón Platanero |
| 36 | Jochis, Tarotista Gamer | Ligero · mando · pasiva Arcano Mayor (1:00) | 76 | Tirada de Tarot (arcano al azar) | Rueda de la Fortuna | El Carro | La Justicia (counter ×1.3) |

Con el medidor lleno: Aria potencia su siguiente especial ("Crescendo") y Luma invoca al espíritu Fuego Fatuo durante 12 s.
