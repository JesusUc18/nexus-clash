/* ==========================================================================
 * NEXUS CLASH — js/ui/changelog.js  (V1.2)
 * Panel de NOVEDADES. Cada vez que el juego se actualiza:
 *   1) Cambia NX.VERSION.
 *   2) Añade una entrada NUEVA al principio de CHANGELOG.
 * El panel aparece solo (una vez) al entrar al menú principal si el jugador
 * todavía no ha visto esa versión. También se abre desde REGLAS → NOVEDADES.
 * Etiquetas: 'nuevo' · 'cambio' · 'ajuste' · 'arreglo'.
 * ========================================================================== */
(function (NX) {
  'use strict';

  NX.VERSION = '1.3';

  NX.CHANGELOG = [
    {
      version: '1.3', date: 'Noviembre 2026', title: 'Luchadores rediseñados',
      items: [
        ['nuevo', '<b>Los 36 luchadores rediseñados</b>: volumen con luz y sombra, brazos y piernas que se afinan, cuello y una sombra en el suelo que sigue sus saltos.'],
        ['nuevo', '<b>Ojos nuevos</b> con iris, brillos y párpado: ahora <b>parpadean</b>. Manos, zapatos con suela y hebillas con más detalle.'],
        ['nuevo', '<b>Detalles propios</b> para cada uno: el reloj de Chronia marca la hora real, el suéter de BigSimio es de punto, las botas de Jett echan fuego, Volta suelta chispas y Medu, burbujas.'],
        ['cambio', '<b>Armas</b> más trabajadas: espadas con pomo, vendas, canal y destello; martillo metálico y bastón con gema brillante.'],
        ['cambio', 'Monocromo conserva su silueta plana de pantalla LCD.']
      ]
    },
    {
      version: '1.2.1', date: 'Noviembre 2026', title: 'Ajustes de balance',
      items: [
        ['ajuste', '<b>Jochis</b>: el Arcano Mayor se activa al sobrevivir <b>1:00</b> sin perder la vida (antes 1:30).'],
        ['ajuste', '<b>BigSimio</b>: Simio Molesto se activa al <b>100%</b> (antes 110%).'],
        ['ajuste', '<b>Torva</b>: <b>+10% de alcance</b> en sus golpes normales.'],
        ['ajuste', '<b>Kestra</b>: el disparo cargado al máximo hace <b>24%</b> (antes 28%).'],
        ['ajuste', '<b>LosGemelos · Copete</b>: el Píxel Cargado llega <b>~35% menos lejos</b>.'],
        ['cambio', '<b>Tier List recalculada</b>: Jochis sube a <b>A+</b>, LosGemelos baja a <b>A−</b>, Torva encabeza <b>S−</b>, BigSimio encabeza <b>S+</b> y Kestra queda al final de <b>B−</b>.']
      ]
    },
    {
      version: '1.2', date: 'Noviembre 2026', title: 'Tier List y modo Práctica',
      items: [
        ['nuevo', 'Modo <b>PRÁCTICA</b> (menú principal): tú contra un muñeco que no se mueve, sin vidas ni tiempo. El HUD cuenta los golpes y el daño de cada <b>combo</b> y guarda tu mejor combo.'],
        ['nuevo', 'En la pausa de Práctica: <b>REINICIAR POSICIONES (0%)</b> y <b>CAMBIAR LUCHADORES</b> sin salir del modo.'],
        ['nuevo', '<b>TIER LIST</b> en REGLAS: los 36 luchadores clasificados de <b>S+</b> a <b>E</b> según daño, velocidad de reacción, peso, movilidad, alcance y kit.'],
        ['nuevo', 'Toca cualquier luchador de la Tier List para ver su <b>ficha</b>: barras de estadísticas, su pasiva y por qué está en ese puesto.'],
        ['nuevo', 'Botón <b>LUCHAR CON…</b> en la ficha: te lleva directo a 1 VS 1 con ese luchador ya elegido.'],
        ['nuevo', 'Panel de <b>NOVEDADES</b>: aparece la primera vez que abres cada versión nueva. Puedes volver a verlo en REGLAS → NOVEDADES.'],
        ['cambio', 'La pantalla de REGLAS ahora es el centro de <b>ajustes</b>: reglas, audio, controles táctiles, Tier List y novedades.']
      ]
    },
    {
      version: '1.1', date: 'Noviembre 2026', title: 'BigSimio y Jochis',
      items: [
        ['nuevo', '<b>BigSimio, Simio del Termo</b>: pesado y lento con mucho daño. Termazos y bananas; desde 110% se enfurece (+15% velocidad y daño).'],
        ['nuevo', '<b>Jochis, Tarotista Gamer</b>: ligero y con buen daño. Mando rosa y cartas de tarot; si aguanta 1:30 gana +25% de alcance y +30% de peso.'],
        ['cambio', '36 luchadores en total.']
      ]
    },
    {
      version: '1.0', date: 'Noviembre 2026', title: 'Versión oficial',
      items: [
        ['nuevo', 'Portada nueva con desfile de luchadores e ícono propio para instalar en el celular.'],
        ['cambio', 'Selección de personajes, escenarios y controles más claros en laptop y teléfono.'],
        ['ajuste', 'HUD compacto en teléfono, botón de pausa rediseñado y resultados con el ganador.']
      ]
    },
    {
      version: 'v8', date: '', title: 'Modo HORDA',
      items: [
        ['nuevo', '<b>HORDA</b>: 10 oleadas de rivales al azar contra reloj, con un JEFE FINAL en la oleada 10 y récord guardado.'],
        ['cambio', 'El botón de descarga .ZIP pasa a la esquina del menú principal.']
      ]
    }
  ];

  const SEEN_KEY = 'nexusclash.seenVersion';
  NX.News = {
    seen() { try { return localStorage.getItem(SEEN_KEY); } catch (e) { return NX.VERSION; } },
    markSeen() { try { localStorage.setItem(SEEN_KEY, NX.VERSION); } catch (e) { /* almacenamiento no disponible */ } },
    isNew() { return this.seen() !== NX.VERSION; }
  };
})(window.NX = window.NX || {});
