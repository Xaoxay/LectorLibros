// App.js - Lector Libros (Lector Libros Completo - 10 Pantallas)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  StyleSheet,
  ScrollView,
  Share,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { parseEpubFromBase64 } from "./src/epub";
import Reader from "./src/Reader";
import CatalogScreen from "./src/CatalogScreen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/* ==========================================================================
   UTILIDADES PARA DECODIFICACIÓN Y PARSEO NATIVO DE EPUB
   ========================================================================== */
/* ==========================================================================
   PALETA DE COLORES Y TEMAS
   ========================================================================== */
const COLORS = {
  bg: "#090d16",
  bgCard: "#0f1726",
  bgElevated: "#162032",
  accent: "#2563eb",
  accentLight: "#38bdf8",
  accentGlow: "rgba(56, 189, 248, 0.25)",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  border: "#1e293b",
  borderLight: "#334155",
  success: "#10b981",
  danger: "#ef4444",
  // Temas del Lector
  sepiaBg: "#fbf0d9",
  sepiaText: "#2c1e11",
  sepiaBorder: "#e5d5b7",
  darkBg: "#050811",
  darkText: "#e2e8f0",
  darkBorder: "#1e293b",
};

/* ==========================================================================
   DATOS INICIALES (Muestras de lectura; no son libros completos)
   ========================================================================== */
const INITIAL_BOOKS = [
  {
    id: "sample_principito",
    name: "El Principito · muestra",
    author: "Antoine de Saint-Exupéry",
    type: "epub",
    cover: "https://m.media-amazon.com/images/I/71OzywnN6yL._AC_UF1000,1000_QL80_.jpg",
    progress: 0,
    isFavorite: true,
    pages: [
      "Capítulo 1\n\nCuando yo tenía seis años vi en un libro sobre la selva virgen que se titulaba 'Historias vividas', una magnífica lámina. Representaba una serpiente boa que se tragaba a una fiera.\n\nEl libro decía: 'Las serpientes boas tragan sus presas enteras, sin masticarlas. Luego no pueden moverse y duermen durante los seis meses que dura su digestión.'\n\nReflexioné mucho entonces sobre las aventuras de la selva y, a mi vez, logré trazar con un lápiz de color mi primer dibujo. Mi dibujo número 1 era así: enseñé mi obra de arte a las personas mayores y les pregunté si mi dibujo les daba miedo.\n\nEllas me respondieron: '¿Por qué habría de dar miedo un sombrero?'. Mi dibujo no representaba un sombrero. Representaba una serpiente boa que digería un elefante. Dibujé entonces el interior de la serpiente boa a fin de que las personas mayores pudieran comprender. Siempre necesitan explicaciones.",
      "Capítulo 2\n\nViví así, solo, sin nadie con quien hablar verdaderamente, hasta que tuve una avería en el desierto de Sahara, hace seis años. Algo se había roto en mi motor.\n\nY como no llevaba conmigo ni mecánico ni pasajeros, me dispuse a realizar, solo, una difícil reparación. Era para mí una cuestión de vida o muerte. Tenía agua de beber apenas para ocho días.\n\nLa primera noche me dormí sobre la arena, a mil millas de toda tierra habitada. Estaba más aislado que un náufrago en una balsa en medio del océano.\n\nImaginen, pues, mi sorpresa cuando, al romper el día, me despertó una extraña vocecita que decía:\n\n—Por favor... ¡dibújame un cordero!\n—¿Eh?\n—Dibújame un cordero...\n\nMe puse de pie de un salto, como si hubiera sido alcanzado por un rayo. Me froté bien los ojos. Miré cuidadosamente. Y vi un hombrecito extraordinario que me examinaba gravemente.",
      "Capítulo 3\n\nMe costó mucho tiempo comprender de dónde venía. El principito, que me hacía muchas preguntas, jamás parecía oír las mías.\n\nFueron palabras pronunciadas al azar las que, poco a poco, me revelaron todo. Así, cuando vio por primera vez mi avión me preguntó:\n\n—¿Qué es esa cosa?\n—No es una cosa. Vuela. Es un avión. Es mi avión.\nY me sentí orgulloso de hacerle saber que volaba. Entonces gritó:\n\n—¡Cómo! ¿Has caído del cielo?\n—Sí —dije modestamente.\n—¡Ah! ¡Eso es curioso!...\n\nY el principito soltó una hermosa carcajada que me irritó mucho. Me gusta que mis desgracias se tomen en serio. Luego agregó:\n\n—Entonces, ¿tú también vienes del cielo? ¿De qué planeta eres?\n\nEntrevi de pronto una claridad en el misterio de su presencia y pregunté bruscamente:\n\n—¿Vienes, pues, de otro planeta?\n\nPero no me respondió. Meneaba la cabeza suavemente mirando mi avión.",
      "Capítulo 4\n\nSupe así una segunda cosa muy importante: ¡su planeta de origen era apenas más grande que una casa!\n\nEsto no podía asombrarme mucho. Sabía bien que, fuera de los grandes planetas como la Tierra, Júpiter, Marte o Venus, que tienen nombre, hay centenares de otros que son a veces tan pequeños que cuesta trabajo verlos con el telescopio.\n\nTengo serias razones para creer que el planeta de donde venía el principito era el asteroide B 612. Este asteroide no fue visto más que una vez con el telescopio, en 1909, por un astrónomo turco.\n\nSi les he contado estos detalles sobre el asteroide B 612 y si les he confiado su número, es por culpa de las personas mayores. A las personas mayores les gustan las cifras. Cuando les hablan de un nuevo amigo, jamás les preguntan lo esencial. Nunca les dicen: '¿Cuál es el tono de su voz? ¿Qué juegos prefiere? ¿Colecciona mariposas?'. Les preguntan: '¿Qué edad tiene? ¿Cuántos hermanos tiene? ¿Cuánto gana su padre?'. Solo entonces creen conocerle.",
      "Capítulo 5\n\nCada día yo aprendía algo nuevo sobre el planeta, sobre la partida, sobre el viaje. Todo venía muy suavemente, al azar de las reflexiones. Fue así como, al tercer día, conocí el drama de los baobabs.\n\nEsta vez también fue gracias al cordero, pues el principito me preguntó bruscamente, como asaltado por una duda grave:\n\n—¿Es verdad, no es cierto, que a los corderos les gusta comer arbustos?\n—Sí, es verdad.\n—¡Ah! ¡Qué contento estoy!\n\nNo comprendí por qué era tan importante que los corderos comiesen arbustos. Pero el principito agregó:\n\n—Por consiguiente, ¿también comen baobabs?\n\nLe hice notar al principito que los baobabs no son arbustos, sino árboles grandes como iglesias y que, aun si llevara consigo toda una tropa de elefantes, la tropa no llegaría a acabar con un solo baobab.",
      "Capítulo 21\n\nFue entonces cuando apareció el zorro.\n\n—Buenos días —dijo el zorro.\n—Buenos días —respondió cortésmente el principito, que se volvió pero no vio nada.\n—Estoy aquí —dijo la voz—, bajo el manzano...\n—¿Quién eres? —preguntó el principito—. Eres muy lindo...\n—Soy un zorro —dijo el zorro.\n—Ven a jugar conmigo —le propuso el principito—; ¡estoy tan triste!\n—No puedo jugar contigo —dijo el zorro—. No estoy domesticado.\n—¡Ah! Perdón —dijo el principito. Pero, después de reflexionar, agregó:\n—¿Qué significa 'domesticar'?\n—Es una cosa demasiado olvidada —dijo el zorro—. Significa 'crear lazos'...\n\nY el zorro concluyó con su mayor secreto:\n\n—He aquí mi secreto. Es muy simple: solo se ve bien con el corazón. Lo esencial es invisible para los ojos.",
    ],
  },
  {
    id: "sample_1984",
    name: "1984 · muestra",
    author: "George Orwell",
    type: "epub",
    cover: "https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg",
    progress: 0,
    isFavorite: true,
    pages: [
      "Parte 1 — Capítulo I\n\nEra un día luminoso y frío de abril y los relojes daban las trece. Winston Smith, con la barbilla clavada en el pecho para evitar el viento cortante, se deslizó rápidamente por las puertas de cristal de las Casas de la Victoria, aunque no con suficiente rapidez para evitar que un remolino de polvo arenoso entrara con él.\n\nEl vestíbulo olía a col hervida y a esteras viejas. Al fondo, un cartel de colores, demasiado grande para estar en el interior, estaba clavado en la pared. Representaba una enorme cara de más de un metro de ancho: la cara de un hombre de unos cuarenta y cinco años, con un espeso bigote negro y rasgos atractivos pero duros.\n\nWinston se dirigió a las escaleras. No valía la pena intentar tomar el ascensor. Incluso en las mejores épocas rara vez funcionaba y en aquellos momentos la corriente eléctrica permanecía cortada durante las horas del día. Formaba parte de la campaña de ahorro en preparación para la Semana del Odio.",
      "Parte 1 — Capítulo II\n\nWinston se dirigió hacia la ventana. Era una figura pequeña y frágil, cuya delgadez no hacía más que resaltar el mono azul que constituía el uniforme del Partido.\n\nEn cada descansillo, frente al hueco del ascensor, el cartel de la cara enorme miraba desde la pared. Era uno de esos dibujos realizados de tal forma que los ojos siguen a quien los mira dondequiera que se mueva. EL GRAN HERMANO TE VIGILA, decía el texto al pie.\n\nEn el interior del piso, una voz melodiosa leía una lista de cifras que tenían que ver con la producción de arrabio. La voz provenía de una placa oblonga de metal, parecida a un espejo opaco, empotrada en la pared de la derecha. Winston accionó un interruptor y la voz disminuyó un tanto, aunque las palabras aún se distinguían con claridad. Aquel artefacto (llamado telepantalla) podía atenuarse, pero no había manera de desconectarlo por completo.",
      "Parte 1 — Capítulo III\n\nAl mirar a su alrededor, se dio cuenta de que lo que estaba a punto de hacer era empezar a escribir un diario. No era ilegal (nada era ilegal, ya que ya no había leyes), pero si lo descubrían era razonablemente seguro que sería castigado con la muerte o con al menos veinticinco años en un campo de trabajos forzados.\n\nWinston encajó una plumilla en el portaplumas y la chupó para quitarle la grasa. La pluma era un instrumento arcaico, que rara vez se utilizaba incluso para firmas, y la había adquirido clandestinamente por puro placer táctil.\n\nApoyó la pluma en el papel blanco cremoso. Escribió:\n\n4 de abril de 1984.\n\nSe recostó. Le invadió una sensación de total impotencia. Para empezar, ni siquiera sabía con certeza si era 1984. Solo sabía que tenía treinta y nueve años y creía haber nacido en 1944 o 1945.",
      "Parte 1 — Capítulo IV\n\nLos Dos Minutos de Odio habían comenzado.\n\nComo de costumbre, la cara de Emmanuel Goldstein, el Enemigo del Pueblo, había irrumpido en la telepantalla. Se oían silbidos de rabia procedentes de los presentes en la sala. La mujer menuda de pelo arenoso dejó escapar un gemido mezclado de miedo y asco.\n\nGoldstein era el renegado y traidor que en tiempos lejanos había sido una de las figuras dirigentes del Partido, casi al mismo nivel que el Gran Hermano, y luego se había dedicado a actividades contrarrevolucionarias, había sido condenado a muerte y se había escapado misteriosamente.\n\nTodos los crímenes posteriores contra el Partido, todas las traiciones, los sabotajes, las desviaciones de pensamiento, brotaban directamente de su enseñanza clandestina.",
      "Parte 1 — Capítulo V\n\nEl Ministerio de la Verdad —Miniver, en neolengua— contenía, según se decía, tres mil habitaciones sobre el nivel del suelo y las correspondientes ramificaciones subterráneas.\n\nEn Londres no había más que otros tres edificios de aspecto y dimensiones semejantes. Empequeñecían por completo la arquitectura circundante.\n\nEran los cuatro Ministerios entre los que se dividía la totalidad del aparato gubernamental: el Ministerio de la Verdad, que se ocupaba de las noticias, los espectáculos, la educación y las bellas artes; el Ministerio de la Paz, que se ocupaba de la guerra; el Ministerio del Amor, que mantenía la ley y el orden; y el Ministerio de la Abundancia, responsable de los asuntos económicos.\n\nSus nombres en neolengua: Miniver, Minipax, Minimor y Minibund.",
    ],
  },
  {
    id: "sample_habitos",
    name: "Hábitos atómicos · muestra",
    author: "James Clear",
    type: "epub",
    cover: "https://m.media-amazon.com/images/I/81i9o11+oSL._AC_UF1000,1000_QL80_.jpg",
    progress: 0,
    isFavorite: false,
    pages: [
      "Introducción: El poder del 1%\n\nEs tan fácil sobreestimar la importancia de un momento decisivo y subestimar el valor de hacer pequeñas mejoras a diario.\n\nCon frecuencia, nos convencemos de que un cambio enorme requiere una acción masiva. Ya sea perder peso, fundar una empresa, escribir un libro o ganar un campeonato, nos presionamos para lograr una mejora descomunal que todos comenten.\n\nSin embargo, mejorar un 1% cada día apenas se nota al principio; a veces ni siquiera se percibe. Pero a largo plazo, la diferencia es asombrosa:\n\nSi logras ser 1% mejor cada día durante un año, terminarás siendo 37 veces mejor al concluirlo. Por el contrario, si empeoras 1% cada día, terminarás prácticamente en cero.",
      "Capítulo 1: Hábitos basados en la identidad\n\nEl cambio de conducta consta de tres capas concéntricas:\n\n1. Cambiar los resultados (lo que obtienes: perder 5 kilos, publicar un libro).\n2. Cambiar tus procesos (lo que haces: implementar una nueva rutina de entrenamiento, limpiar tu escritorio).\n3. Cambiar tu identidad (lo que crees: tus cosmovisiones, tu autoimagen, tus convicciones sobre ti mismo).\n\nMuchos intentan cambiar enfocándose en los resultados. La verdadera transformación surge cuando te enfocas en quién deseas ser.\n\nNo digas: 'Estoy intentando dejar de fumar'. Di: 'No soy fumador'. La meta no es leer un libro, la meta es convertirte en lector.",
      "Capítulo 2: El ciclo neurológico del hábito\n\nTodo hábito humano se puede descomponer en un ciclo neurológico de cuatro pasos continuos:\n\n1. La Señal: Desencadena en el cerebro la predicción de una recompensa.\n2. El Anhelo: La fuerza motivacional detrás de cada acción. Lo que anhelas no es el hábito en sí, sino el cambio de estado emocional que produce.\n3. La Respuesta: La acción concreta que realizas, la cual puede ser un pensamiento o una acción física.\n4. La Recompensa: El destino final de cada hábito. Sirve para satisfacer el anhelo inicial y enseñarle al cerebro qué acciones vale la pena recordar.\n\nSi una conducta carece de alguno de estos cuatro pasos, jamás se consolidará como hábito.",
      "Capítulo 3: Las 4 Leyes del Cambio de Conducta\n\nPara crear un buen hábito:\n\n• 1ª Ley (Señal): Hazlo obvio. Diseña tu entorno para que los detonantes positivos sean visibles y llamativos.\n• 2ª Ley (Anhelo): Hazlo atractivo. Asocia el hábito con una emoción positiva o recompensa inmediata.\n• 3ª Ley (Respuesta): Hazlo sencillo. Reduce la fricción al mínimo. Aplica la regla de los dos minutos: cuando empieces un nuevo hábito, haz que tome menos de dos minutos.\n• 4ª Ley (Recompensa): Hazlo satisfactorio. Lo que se recompensa de inmediato se repite; lo que se castiga de inmediato se evita.",
      "Capítulo 4: El secreto para mantener los hábitos\n\nLa mayor amenaza para el éxito no es el fracaso; es el aburrimiento.\n\nNos aburrimos de los hábitos porque dejan de fascinarnos. La novedad se desvanece. Y en ese preciso instante, cuando la rutina se vuelve tediosa, es cuando los profesionales marcan la diferencia respecto a los aficionados.\n\nCualquiera puede trabajar duro cuando se siente motivado. La capacidad de seguir trabajando cuando no tienes ganas es lo que te separa del resto.\n\nNo rompas la cadena: si fallas un día por un imprevisto, asegúrate de no fallar dos días consecutivos.",
    ],
  },
  {
    id: "sample_sapiens",
    name: "Sapiens · muestra",
    author: "Yuval Noah Harari",
    type: "epub",
    cover: "https://m.media-amazon.com/images/I/713jIoMO3UL._AC_UF1000,1000_QL80_.jpg",
    progress: 0,
    isFavorite: false,
    pages: [
      "Primera parte: Un animal sin importancia\n\nHace unos 13.500 millones de años, la materia, la energía, el tiempo y el espacio tuvieron su origen en lo que se conoce como el Big Bang. El relato de estas características fundamentales de nuestro universo se llama física.\n\nHace unos 70.000 años, organismos pertenecientes a la especie Homo sapiens empezaron a formar estructuras todavía más complejas llamadas culturas. El desarrollo subsiguiente de estas culturas humanas se llama historia.\n\nLo más importante que hay que saber sobre los humanos prehistóricos es que eran animales insignificantes que no ejercían más impacto en su entorno que los gorilas, las luciérnagas o las medusas.",
      "Capítulo 1: El árbol del conocimiento\n\nEntre hace 70.000 y 30.000 años se produjo la invención de barcas, lámparas de aceite, arcos y flechas y agujas para coser.\n\nLa mayoría de los investigadores creen que estos logros sin precedentes fueron el producto de una revolución en las capacidades cognitivas de los sapiens. La teoría más comúnmente aceptada sostiene que mutaciones genéticas accidentales cambiaron las conexiones internas del cerebro de los sapiens.\n\n¿Qué tenía de tan especial el nuevo lenguaje de los sapiens? La respuesta más probable es que nuestro lenguaje es asombrosamente flexible y nos permite transmitir información sobre cosas que no existen en absoluto: mitos, leyendas y ficciones.",
      "Capítulo 2: La leyenda de Peugeot\n\n¿Cómo consiguió el Homo sapiens cruzar el umbral crítico de cooperar en grupos de cientos de miles de individuos?\n\nLa respuesta es: mediante la ficción compartida. Dos chimpancés no pueden ponerse de acuerdo para ir juntos a cazar un babuino si no se conocen personalmente.\n\nEn cambio, millones de desconocidos pueden cooperar con éxito si creen en los mismos mitos comunes: naciones, religiones, derechos humanos o dinero.\n\nUna empresa moderna como Peugeot no es un objeto físico, ni sus fábricas ni sus trabajadores. Es una 'ficción legal', una creación de la imaginación humana que existe únicamente en los relatos que nos contamos unos a otros.",
      "Capítulo 3: El diluvio del Homo sapiens\n\nAntes de la Revolución Cognitiva, los humanos vivían exclusivamente en el continente afroasiático. Pero hace unos 45.000 años, los sapiens consiguieron construir embarcaciones capaces de navegar a mar abierto y alcanzaron Australia.\n\nEl momento en que el primer cazador-recolector pisó una playa australiana marcó el instante en que el Homo sapiens ascendió al peldaño superior de la cadena alimentaria en ese continente.\n\nEn cuestión de unos pocos milenios, desaparecieron 23 de las 24 especies de animales de más de 50 kilos que habitaban Australia: diprotodontes gigantes, leones marsupiales y canguros colosales. Fue la primera gran oleada de extinción provocada por nuestra especie.",
      "Capítulo 4: La trampa de la agricultura\n\nDurante dos millones y medio de años, los humanos se alimentaron recolectando plantas y cazando animales que vivían y se reproducían sin su intervención.\n\nTodo esto cambió hace unos 10.000 años, cuando los sapiens empezaron a dedicar casi todo su tiempo y esfuerzo a manipular la vida de unas pocas especies animales y vegetales. Fue la Revolución Agrícola.\n\nLejos de inaugurar una era de ocio y abundancia, la Revolución Agrícola dejó a los agricultores con una vida generalmente más dura y menos gratificante que la de los cazadores-recolectores. No domesticamos al trigo; el trigo nos domesticó a nosotros.",
    ],
  },
];

const STORAGE_KEY = "@lector_libros_store_v2";

/* ==========================================================================
   GESTOR DE ALMACENAMIENTO Y PORTADAS AUTOMÁTICAS
   ========================================================================== */
async function loadStoredBooks() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKS));
      return INITIAL_BOOKS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return INITIAL_BOOKS;
    }

    // Compatibilidad con muestras guardadas en versiones anteriores
    const merged = parsed.map((book) => {
      const sampleMatch = INITIAL_BOOKS.find((s) => s.id === book.id);
      if (sampleMatch && (!book.pages || book.pages.length < sampleMatch.pages.length)) {
        return { ...book, name: sampleMatch.name, pages: sampleMatch.pages, type: sampleMatch.type };
      }
      return sampleMatch ? { ...book, name: sampleMatch.name } : book;
    });

    const states = await AsyncStorage.multiGet(merged.map(b => "reader:" + b.id));
    return merged.map((book, i) => {
      try { return { ...book, ...JSON.parse(states[i][1] || "{}") }; }
      catch { return book; }
    });
  } catch (e) {
    return INITIAL_BOOKS;
  }
}

async function saveAllBooks(books) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (e) {
    Alert.alert("No se pudo guardar", "Revisa el espacio disponible e inténtalo de nuevo.");
    throw e;
  }
}

// Búsqueda inteligente de portadas en Google Books
async function fetchCoverForTitle(title) {
  try {
    const clean = title.replace(/\.(pdf|epub)$/i, "").replace(/[_-]/g, " ").trim();
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(clean)}&maxResults=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const thumb = data.items[0].volumeInfo?.imageLinks?.thumbnail;
      if (thumb) {
        return thumb.replace("http://", "https://");
      }
    }
  } catch (e) {
    // Si falla la red, regresa null para usar la carátula estilizada
  }
  return null;
}

/* ==========================================================================
   COMPONENTE: Portada Gráfica con Fallback Estilizado
   ========================================================================== */
function BookCoverImage({ coverUrl, title, type, width = 145, height = 205, style }) {
  const [imgError, setImgError] = useState(false);

  // Paleta de colores para carátulas generadas
  const colors = [
    ["#1e3a8a", "#0284c7"],
    ["#831843", "#db2777"],
    ["#064e3b", "#10b981"],
    ["#701a75", "#c026d3"],
    ["#7c2d12", "#ea580c"],
  ];
  const charCode = (title || "A").charCodeAt(0) % colors.length;
  const [bgColor, accentColor] = colors[charCode];

  if (coverUrl && !imgError) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={[{ width, height, borderRadius: 10, backgroundColor: "#1e293b" }, style]}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  // Carátula estética simulada de libro físico
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: 10,
          backgroundColor: bgColor,
          padding: 12,
          justifyContent: "space-between",
          borderLeftWidth: 5,
          borderLeftColor: "rgba(255,255,255,0.25)",
          borderWidth: 1,
          borderColor: accentColor,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700" }}>
          LECTOR LIBROS
        </Text>
        <View style={{ backgroundColor: accentColor, paddingHorizontal: 5, borderRadius: 4 }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
            {(type || "LIBRO").toUpperCase()}
          </Text>
        </View>
      </View>

      <View>
        <Text style={{ fontSize: 24, textAlign: "center", marginBottom: 6 }}>📖</Text>
        <Text
          numberOfLines={3}
          style={{
            color: "#ffffff",
            fontSize: 13,
            fontWeight: "800",
            textAlign: "center",
            lineHeight: 17,
          }}
        >
          {title}
        </Text>
      </View>

      <View style={{ height: 2, backgroundColor: "rgba(255,255,255,0.3)" }} />
    </View>
  );
}

/* ==========================================================================
   COMPONENTE: Barra de Navegación Inferior (4 Pestañas)
   ========================================================================== */
function BottomNavBar({ activeTab, navigation }) {
  const tabs = [
    { key: "Home", label: "Inicio", icon: "home-outline", activeIcon: "home" },
    { key: "Library", label: "Biblioteca", icon: "library-outline", activeIcon: "library" },
    { key: "Search", label: "Buscar", icon: "search-outline", activeIcon: "search" },
    { key: "Profile", label: "Perfil", icon: "person-outline", activeIcon: "person" },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => navigation.navigate(t.key)}
            style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name={isActive ? t.activeIcon : t.icon} size={23} color={isActive ? COLORS.accentLight : COLORS.textMuted} />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HomeScreen({ navigation }) {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const refresh = () => loadStoredBooks().then(setBooks);
    refresh();
    return navigation.addListener("focus", refresh);
  }, [navigation]);

  const recent = [...books]
    .filter((book) => book.progress > 0 || book.lastReadAt)
    .sort((a, b) => String(b.lastReadAt || "").localeCompare(String(a.lastReadAt || "")))[0];

  const homeAction = (icon, title, subtitle, action) => (
    <Pressable accessibilityRole="button" onPress={action} style={({ pressed }) => [styles.homeAction, pressed && { opacity: 0.7 }]}>
      <View style={styles.homeActionIcon}><Ionicons name={icon} size={24} color={COLORS.accentLight} /></View>
      <View style={{ flex: 1 }}><Text style={styles.homeActionTitle}>{title}</Text><Text style={styles.homeActionSubtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.homeContent}>
        <Text style={styles.homeEyebrow}>LECTOR LIBROS</Text>
        <Text style={styles.homeTitle}>Tu próxima lectura empieza acá</Text>
        <Text style={styles.homeSubtitle}>Leé, resaltá frases y guardá tus ideas en un solo lugar.</Text>

        {recent ? <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Reader", { book: recent })} style={({ pressed }) => [styles.continueCard, pressed && { opacity: 0.75 }]}>
          <BookCoverImage coverUrl={recent.cover} title={recent.name} type={recent.type} width={72} height={104} />
          <View style={{ flex: 1, gap: 5 }}><Text style={styles.homeEyebrow}>CONTINUAR LEYENDO</Text><Text numberOfLines={2} style={styles.continueTitle}>{recent.name}</Text><Text numberOfLines={1} style={styles.homeActionSubtitle}>{recent.author}</Text><Text style={styles.continueProgress}>{recent.progress || 0}% completado</Text></View>
        </Pressable> : <View style={styles.continueCard}><View style={styles.homeActionIcon}><Ionicons name="book-outline" size={26} color={COLORS.accentLight} /></View><View style={{ flex: 1 }}><Text style={styles.continueTitle}>Empezá tu biblioteca</Text><Text style={styles.homeActionSubtitle}>Descargá un clásico o importá tu propio libro.</Text></View></View>}

        <Text style={styles.homeSectionTitle}>¿Qué querés hacer?</Text>
        {homeAction("search", "Buscar libros", "Descargá EPUB gratuitos de dominio público", () => navigation.navigate("Search"))}
        {homeAction("add-circle-outline", "Importar un archivo", "Agregá un PDF o EPUB desde tu dispositivo", () => navigation.navigate("Upload"))}
        {homeAction("library-outline", "Abrir biblioteca", `${books.length} libros disponibles`, () => navigation.navigate("Library"))}
      </ScrollView>
      <BottomNavBar activeTab="Home" navigation={navigation} />
    </SafeAreaView>
  );
}

function LibraryScreen({ navigation, route }) {
  const [books, setBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'pdf', 'epub'

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      loadStoredBooks().then(setBooks);
    });
    loadStoredBooks().then(setBooks);
    return unsub;
  }, [navigation]);

  useEffect(() => {
    setFilterType(route.params?.filter || "all");
  }, [route.params?.filter]);

  // Filtrado por formato y búsqueda
  const filteredBooks = books.filter((b) => {
    const matchesQuery =
      (b.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;
    if (filterType === "favorites") return b.isFavorite;
    if (filterType === "history") return !!b.progress;
    if (filterType === "pdf") return (b.type || "").toLowerCase() === "pdf";
    if (filterType === "epub") return (b.type || "").toLowerCase() === "epub";
    return true;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Cabecera superior */}
      <View style={styles.libraryHeaderRow}>
        <Text style={styles.libraryTitle}>Mi Biblioteca</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          style={styles.avatarCircle}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de búsqueda y botón '+' */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            placeholder="Buscar libros..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchBarInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>✖</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Upload")}
          style={styles.btnAddBook}
          activeOpacity={0.8}
        >
          <Text style={styles.btnAddBookText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Chips de filtro */}
      <View style={styles.filterChipsRow}>
        {[
          { key: "all", label: "Todos" },
          { key: "pdf", label: "PDF" },
          { key: "epub", label: "EPUB" },
        ].map((f) => {
          const active = filterType === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilterType(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grilla de libros (2 columnas) */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => navigation.navigate("BookDetail", { book: item })}
            activeOpacity={0.8}
          >
            <BookCoverImage
              coverUrl={item.cover}
              title={item.name}
              type={item.type}
              width={SCREEN_WIDTH * 0.43}
              height={SCREEN_WIDTH * 0.58}
            />
            <Text style={styles.bookCardTitle} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.bookCardMetaRow}>
              <View
                style={[
                  styles.badgeFormat,
                  item.type === "pdf" ? styles.badgePdf : styles.badgeEpub,
                ]}
              >
                <Text style={styles.badgeFormatText}>{(item.type || "EPUB").toUpperCase()}</Text>
              </View>
              {item.progress !== undefined && (
                <Text style={styles.bookCardProgressText}>{item.progress}%</Text>
              )}
            </View>

            {/* Barra de progreso */}
            <View style={styles.progressBarTrack}>
              <View
                style={[styles.progressBarThumb, { width: `${item.progress || 0}%` }]}
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>📚</Text>
            <Text style={styles.emptyTitle}>No se encontraron libros</Text>
            <Text style={styles.emptySubtitle}>
              Prueba con otro término de búsqueda o añade un libro con el botón superior.
            </Text>
          </View>
        }
      />

      <BottomNavBar activeTab="Library" navigation={navigation} />
    </SafeAreaView>
  );
}

/* ==========================================================================
   PANTALLA 4: SUBIDA DE LIBROS (UploadScreen)
   ========================================================================== */
function UploadScreen({ navigation }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handlePickDocument = async () => {
    try {
      setUploading(true);
      setUploadStatus("Seleccionando archivo...");
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
        copyToCacheDirectory: true,
      });

      if (res.type === "cancel") {
        setUploading(false);
        setUploadStatus("");
        return;
      }

      const { name, uri } = res;
      if (!/\.(pdf|epub)$/i.test(name || "")) throw new Error("Selecciona un archivo PDF o EPUB.");
      const isPdf = name.toLowerCase().endsWith(".pdf");
      const bookId = "book_" + Date.now();

      setUploadStatus("Guardando archivo en el dispositivo...");
      const booksDir = FileSystem.documentDirectory + "books/";
      const dirInfo = await FileSystem.getInfoAsync(booksDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(booksDir, { intermediates: true });
      }

      const extension = isPdf ? ".pdf" : ".epub";
      const permanentUri = booksDir + bookId + extension;
      await FileSystem.copyAsync({ from: uri, to: permanentUri });

      let bookTitle = name.replace(/\.(pdf|epub)$/i, "").replace(/[_-]/g, " ").trim();
      let authorName = "Archivo local";
      let detectedCover = null;
      let extractedPages = [];

      if (!isPdf) {
        // Parsear EPUB completo con JSZip
        setUploadStatus("Extrayendo capítulos y páginas del EPUB...");
        try {
          const base64Data = await FileSystem.readAsStringAsync(permanentUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const parsed = await parseEpubFromBase64(base64Data, bookTitle);
          if (parsed.title) bookTitle = parsed.title;
          if (parsed.author) authorName = parsed.author;
          if (parsed.cover) detectedCover = parsed.cover;
          if (parsed.pages && parsed.pages.length > 0) {
            extractedPages = parsed.pages;
          }
        } catch (epubErr) {
          await FileSystem.deleteAsync(permanentUri, { idempotent: true });
          throw epubErr;
        }
      }

      let contentUri = null;
      if (!isPdf) {
        contentUri = booksDir + bookId + ".json";
        await FileSystem.writeAsStringAsync(contentUri, JSON.stringify(extractedPages));
      }
      if (detectedCover?.startsWith("data:")) {
        const coverUri = booksDir + bookId + ".cover.jpg";
        await FileSystem.writeAsStringAsync(coverUri, detectedCover.split(",")[1], { encoding: FileSystem.EncodingType.Base64 });
        detectedCover = coverUri;
      }
      const newBook = {
        id: bookId,
        name: bookTitle,
        author: authorName,
        url: permanentUri,
        type: isPdf ? "pdf" : "epub",
        cover: detectedCover,
        progress: 0,
        isFavorite: false,
        contentUri,
        pageCount: extractedPages.length,
      };

      const currentBooks = await loadStoredBooks();
      const updated = [newBook, ...currentBooks];
      await saveAllBooks(updated);

      const countMsg = isPdf
        ? "Documento PDF listo para lectura."
        : `${extractedPages.length} páginas listas para leer.`;

      Alert.alert("¡Libro Agregado!", `"${newBook.name}" se guardó en tu biblioteca. ${countMsg}`);
      navigation.navigate("BookDetail", { book: newBook });
    } catch (e) {
      Alert.alert("Error al cargar", e.message || "No se pudo leer el archivo.");
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }}>
        {/* Cabecera */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.libraryTitle, { marginLeft: 16 }]}>Subir libro</Text>
        </View>

        {/* Nube e Instrucción */}
        <View style={{ alignItems: "center", marginVertical: 12 }}>
          <View style={styles.cloudIconCircle}>
            <Text style={{ fontSize: 40 }}>☁️</Text>
          </View>
          <Text style={styles.uploadMainTitle}>Selecciona un archivo</Text>
          <Text style={styles.uploadSubtitle}>PDF o EPUB</Text>
        </View>

        {/* Zona de arrastre / Dropzone */}
        <TouchableOpacity
          disabled={uploading}
          onPress={handlePickDocument}
          style={styles.dropZoneCard}
          activeOpacity={0.8}
        >
          {uploading ? (
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <ActivityIndicator size="large" color={COLORS.accentLight} />
              <Text style={[styles.dropZoneTitle, { fontSize: 14, marginTop: 14 }]}>
                {uploadStatus || "Procesando archivo..."}
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 42, marginBottom: 12 }}>📄</Text>
              <Text style={styles.dropZoneTitle}>Toca para seleccionar un archivo</Text>
              <Text style={styles.dropZoneHint}>Desde tus carpetas o descargas</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Formatos permitidos */}
        <Text style={styles.formatsLabel}>Formatos permitidos</Text>
        <View style={styles.formatBoxesRow}>
          <View style={styles.formatBox}>
            <Text style={{ fontSize: 26, marginBottom: 4 }}>📄</Text>
            <Text style={styles.formatBoxTitle}>PDF</Text>
          </View>
          <View style={styles.formatBox}>
            <Text style={{ fontSize: 26, marginBottom: 4 }}>📑</Text>
            <Text style={styles.formatBoxTitle}>EPUB</Text>
          </View>
        </View>

        {/* Botón Subir */}
        <TouchableOpacity
          disabled={uploading}
          onPress={handlePickDocument}
          style={[styles.btnPrimary, { marginTop: 24 }]}
          activeOpacity={0.8}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Subir archivo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar activeTab="Upload" navigation={navigation} />
    </SafeAreaView>
  );
}

/* ==========================================================================
   PANTALLA 5: DETALLE DEL LIBRO (BookDetailScreen)
   ========================================================================== */
function BookDetailScreen({ route, navigation }) {
  const { book } = route.params;
  const [currentBook, setCurrentBook] = useState(book);
  useEffect(() => navigation.addListener("focus", () => {
    loadStoredBooks().then(all => setCurrentBook(all.find(b => b.id === book.id) || book));
  }), [navigation, book.id]);

  const toggleFavorite = async () => {
    const all = await loadStoredBooks();
    const updated = all.map((b) =>
      b.id === currentBook.id ? { ...b, isFavorite: !b.isFavorite } : b
    );
    await saveAllBooks(updated);
    setCurrentBook({ ...currentBook, isFavorite: !currentBook.isFavorite });
    Alert.alert(
      "Favoritos",
      !currentBook.isFavorite ? "Añadido a tus favoritos" : "Eliminado de favoritos"
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar libro",
      `¿Estás seguro de que deseas eliminar "${currentBook.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const all = await loadStoredBooks();
            const updated = all.filter((b) => b.id !== currentBook.id);
            await saveAllBooks(updated);
            await AsyncStorage.removeItem("reader:" + currentBook.id);
            const ownedDir = FileSystem.documentDirectory + "books/";
            for (const uri of [currentBook.url, currentBook.contentUri, currentBook.cover]) {
              if (uri && uri.startsWith(ownedDir) && !uri.slice(ownedDir.length).includes("..")) {
                await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
              }
            }
            navigation.navigate("Library");
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Estoy leyendo "${currentBook.name}" de ${currentBook.author || "Autor"} en Lector Libros.`,
      });
    } catch (e) {}
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Barra superior */}
        <View style={styles.detailTopBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {currentBook.name}
          </Text>
          <TouchableOpacity onPress={handleShare} style={{ padding: 8 }}>
            <Text style={{ fontSize: 20, color: COLORS.textMuted }}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Portada central destacada */}
        <View style={{ alignItems: "center", marginVertical: 20 }}>
          <BookCoverImage
            coverUrl={currentBook.cover}
            title={currentBook.name}
            type={currentBook.type}
            width={SCREEN_WIDTH * 0.52}
            height={SCREEN_WIDTH * 0.74}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 10,
            }}
          />
        </View>

        {/* Título y Autor */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={styles.detailBookTitle}>{currentBook.name}</Text>
          <Text style={styles.detailBookAuthor}>
            {currentBook.author || "Autor desconocido"}
          </Text>
          <View
            style={[
              styles.badgeFormat,
              { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
              currentBook.type === "pdf" ? styles.badgePdf : styles.badgeEpub,
            ]}
          >
            <Text style={[styles.badgeFormatText, { fontSize: 11 }]}>
              {(currentBook.type || "EPUB").toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={{ marginVertical: 14 }}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarThumb,
                { width: `${currentBook.progress || 0}%`, backgroundColor: COLORS.accentLight },
              ]}
            />
          </View>
          <Text style={styles.detailProgressText}>
            {currentBook.progress || 0}% completado
          </Text>
        </View>

        {/* Botón Continuar leyendo */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Reader", { book: currentBook })}
          style={styles.btnPrimary}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>{currentBook.previewUrl ? "Ver ficha y vista previa" : "Continuar leyendo"}</Text>
        </TouchableOpacity>

        {/* Acciones del libro */}
        <View style={styles.actionsCard}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.actionRow} activeOpacity={0.7}>
            <Text style={{ fontSize: 20, marginRight: 14 }}>
              {currentBook.isFavorite ? "❤️" : "🤍"}
            </Text>
            <Text style={styles.actionRowText}>
              {currentBook.isFavorite ? "En favoritos" : "Agregar a favoritos"}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity onPress={handleShare} style={styles.actionRow} activeOpacity={0.7}>
            <Text style={{ fontSize: 20, marginRight: 14 }}>⬇️</Text>
            <Text style={styles.actionRowText}>Descargar / Compartir</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity onPress={handleDelete} style={styles.actionRow} activeOpacity={0.7}>
            <Text style={{ fontSize: 20, marginRight: 14 }}>🗑️</Text>
            <Text style={[styles.actionRowText, { color: COLORS.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ==========================================================================
   PANTALLA 6, 7 & 10: LECTOR TIPO KINDLE CON ANIMACIÓN 3D Y SOPORTE PDF
   ========================================================================== */
function ReaderScreen(props) {
  return <Reader {...props} />;
}

/* ==========================================================================
   PANTALLA 8: BUSCAR EN LÍNEA (SearchScreen)
   ========================================================================== */
function SearchScreen(props) {
  return <CatalogScreen {...props} loadBooks={loadStoredBooks} saveBooks={saveAllBooks} bottomBar={<BottomNavBar activeTab="Search" navigation={props.navigation} />} />;
}

/* ==========================================================================
   PANTALLA 9: PERFIL Y CONFIGURACIÓN (ProfileScreen)
   ========================================================================== */
function ProfileScreen({ navigation }) {
  const [totalBooks, setTotalBooks] = useState(0);
  const [profileName, setProfileName] = useState("Lector local");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    loadStoredBooks().then((b) => setTotalBooks(b.length)).catch(() => {});
    AsyncStorage.getItem("@profile_name").then(n => { if (n) setProfileName(n); }).catch(() => {});
    AsyncStorage.getItem("@profile_photo").then(p => { if (p) setProfilePhoto(p); }).catch(() => {});
  }, []);

  const saveName = async (name) => {
    const finalName = name.trim() || "Lector local";
    setProfileName(finalName);
    setIsEditingName(false);
    await AsyncStorage.setItem("@profile_name", finalName);
  };

  const pickPhoto = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: false });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        setProfilePhoto(uri);
        await AsyncStorage.setItem("@profile_photo", uri);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo cargar la imagen.");
    }
  };

  const checkUpdates = () => {
    Alert.alert("Actualización", "LectorLibros está en su última versión (v2.5.0).");
  };

  const menuItems = [
    { key: "books", label: "Mis libros", icon: "📖", action: () => navigation.navigate("Library") },
    { key: "downloads", label: "Descargas", icon: "⬇️", action: () => Alert.alert("Descargas", "Los PDF y EPUB importados se guardan en este dispositivo.") },
    { key: "favs", label: "Favoritos", icon: "❤️", action: () => navigation.navigate("Library", { filter: "favorites" }) },
    { key: "history", label: "Historial de lectura", icon: "🕒", action: () => navigation.navigate("Library", { filter: "history" }) },
    { key: "settings", label: "Configuración", icon: "⚙️", action: () => Alert.alert("Configuración", "Los ajustes de tema, letra y animación están dentro del lector y se guardan en este dispositivo.") },
    { key: "update", label: "Buscar actualizaciones", icon: "🔄", action: checkUpdates },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }}>
        {/* Cabecera */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.libraryTitle}>Mi Perfil</Text>
          <TouchableOpacity onPress={() => Alert.alert("LectorLibros", "Versión 2.5.0\nApp de lectura fluida a 60FPS.")} style={{ padding: 6 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: "600" }}>v2.5.0</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de Usuario */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={pickPhoto} style={styles.profileAvatarLarge}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={{ width: 64, height: 64, borderRadius: 32 }} />
            ) : (
              <Text style={{ fontSize: 34 }}>👤</Text>
            )}
            <View style={{ position: "absolute", bottom: -4, right: -4, backgroundColor: COLORS.accent, borderRadius: 12, padding: 4 }}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ marginLeft: 16, flex: 1 }}>
            {isEditingName ? (
              <TextInput
                style={[styles.profileName, { borderBottomWidth: 1, borderColor: COLORS.accent, padding: 0, margin: 0, height: 26, color: COLORS.text }]}
                value={profileName}
                onChangeText={setProfileName}
                onBlur={() => saveName(profileName)}
                onSubmitEditing={() => saveName(profileName)}
                autoFocus
                returnKeyType="done"
              />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.profileName, { flexShrink: 1 }]} numberOfLines={1}>{profileName}</Text>
                <TouchableOpacity onPress={() => setIsEditingName(true)} style={{ marginLeft: 8, padding: 4 }}>
                  <Ionicons name="pencil" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.profileEmail}>Biblioteca en este dispositivo</Text>
            <Text style={styles.profileBadge}>{totalBooks} libros guardados</Text>
          </View>
        </View>

        {/* Opciones del menú */}
        <View style={styles.profileMenuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.key}>
              <TouchableOpacity onPress={item.action} style={styles.profileMenuItem} activeOpacity={0.7}>
                <Text style={{ fontSize: 20, marginRight: 14 }}>{item.icon}</Text>
                <Text style={styles.profileMenuText}>{item.label}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 16, marginLeft: "auto" }}>›</Text>
              </TouchableOpacity>
              {index < menuItems.length - 1 && <View style={styles.profileMenuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="Profile" navigation={navigation} />
    </SafeAreaView>
  );
}

/* ==========================================================================
   NAVEGACIÓN PRINCIPAL
   ========================================================================== */
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider><NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, animation: "fade" }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Library" component={LibraryScreen} />
          <Stack.Screen name="Upload" component={UploadScreen} />
          <Stack.Screen name="BookDetail" component={BookDetailScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer></SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/* ==========================================================================
   ESTILOS VISUALES
   ========================================================================== */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  homeContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 96,
  },
  homeEyebrow: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  homeTitle: {
    color: COLORS.text,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "800",
    marginTop: 8,
  },
  homeSubtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  homeSectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 26,
    marginBottom: 12,
  },
  continueCard: {
    minHeight: 136,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  continueTitle: {
    color: COLORS.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
  },
  continueProgress: {
    color: COLORS.accentLight,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  homeAction: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgElevated,
  },
  homeActionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  homeActionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  // Welcome Screen
  welcomeContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 90,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    marginTop: 4,
  },
  welcomeHeroWrapper: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_WIDTH - 70,
    borderRadius: 24,
    overflow: "hidden",
    marginVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeHeroImage: {
    width: "100%",
    height: "100%",
  },
  welcomeQuote: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginHorizontal: 12,
    marginBottom: 24,
  },

  // Botones Generales
  btnPrimary: {
    backgroundColor: COLORS.accent,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnSecondary: {
    backgroundColor: COLORS.bgElevated,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  btnSecondaryText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  btnLink: {
    paddingVertical: 14,
  },
  btnLinkText: {
    color: COLORS.accentLight,
    fontSize: 15,
    fontWeight: "600",
  },

  // Auth Screen
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 54,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  legalFooter: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 28,
  },

  // Library Screen
  libraryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  libraryTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "800",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1.5,
    borderColor: COLORS.accentLight,
    justifyContent: "center",
    alignItems: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBarInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  btnAddBook: {
    width: 46,
    height: 46,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnAddBookText: {
    color: COLORS.accentLight,
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 28,
  },
  filterChipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.bgElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterChipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  bookCard: {
    width: SCREEN_WIDTH * 0.43,
    marginBottom: 20,
  },
  bookCardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  bookCardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  badgeFormat: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePdf: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  badgeEpub: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
  },
  badgeFormatText: {
    color: COLORS.accentLight,
    fontSize: 10,
    fontWeight: "800",
  },
  bookCardProgressText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressBarThumb: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },

  // Upload Screen
  cloudIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgElevated,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  uploadMainTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  uploadSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  dropZoneCard: {
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 38, 0.6)",
    paddingVertical: 40,
    alignItems: "center",
    marginVertical: 18,
  },
  dropZoneTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  dropZoneHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  formatsLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  formatBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formatBox: {
    flex: 0.48,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formatBoxTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },

  // Book Detail Screen
  detailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailHeaderTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: 12,
  },
  detailBookTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  detailBookAuthor: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  detailProgressText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  actionRowText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  actionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 50,
  },

  // Reader Screen
  readerTopBar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  readerTopTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: 10,
  },
  readerContentWrapper: {
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  readerText: {
    lineHeight: 28,
    fontFamily: "serif",
    textAlign: "justify",
  },
  readerBottomBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  readerPageIndicator: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Search Screen
  searchTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResultCover: {
    width: 48,
    height: 70,
    borderRadius: 6,
    backgroundColor: "#1e293b",
  },
  searchResultCoverFallback: {
    width: 48,
    height: 70,
    borderRadius: 6,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  searchResultTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  searchResultAuthor: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  searchResultMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },

  // Profile Screen
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
  },
  profileEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  profileBadge: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  profileMenuCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  profileMenuText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 50,
  },

  // Bottom Navigation Bar
  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: "rgba(9, 13, 22, 0.96)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 4,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.accentLight,
    fontWeight: "700",
  },
});
