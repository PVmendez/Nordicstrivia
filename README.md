# 🏆 Nordic Trivia Tournament

Una aplicación React para gestionar un torneo de trivia con tu grupo de amigos. ¡Sin backend, todo funciona en local!

## 🎮 Características

- ✅ **Múltiples Fases**: Arquitectura escalable para agregar nuevas fases
- ✅ **Sistema de Puntuación Global**: Acumula puntos a través de todas las fases
- ✅ **Fase 1: Pasapalabras Completa**: Juego del Rosco A-Z listo para jugar
- ✅ **Tabla General de Puntos**: Ranking actualizado en tiempo real
- ✅ **Datos Mock Incluidos**: 26 preguntas sobre un grupo de amigos ficticio
- ✅ **100% Frontend**: Sin backend, sin base de datos
- ✅ **Diseño Responsive**: Funciona en desktop y mobile

## 🚀 Cómo Empezar

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start
```

La aplicación se abrirá en `http://localhost:3000`

### Build para Producción

```bash
npm run build
```

## 📋 Estructura del Proyecto

```
NordicTrivia/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── TournamentApp.js
│   │   ├── PlayerSetup.js
│   │   ├── PhaseManager.js
│   │   ├── GlobalScoreBoard.js
│   │   ├── TournamentFinal.js
│   │   └── phases/
│   │       ├── PasapalabrasGame.js
│   │       ├── Rosco.js
│   │       ├── QuestionCard.js
│   │       └── PhaseResultScreen.js
│   ├── context/
│   │   └── TournamentContext.js
│   ├── data/
│   │   └── mockData.js
│   ├── styles/
│   │   ├── TournamentApp.css
│   │   ├── PlayerSetup.css
│   │   ├── PhaseManager.css
│   │   ├── GlobalScoreBoard.css
│   │   ├── TournamentFinal.css
│   │   └── phases/
│   │       ├── PasapalabrasGame.css
│   │       ├── Rosco.css
│   │       ├── QuestionCard.css
│   │       └── PhaseResultScreen.css
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 🎮 Cómo Jugar

### 1. **Configuración de Jugadores**
   - Ingresa los nombres de los participantes
   - Mínimo 2 jugadores requerido
   - Haz clic en "Iniciar Torneo"

### 2. **Fase 1: Pasapalabras**
   - Cada jugador responde preguntas para cada letra (A-Z)
   - **Responder Correcta**: +10 puntos
   - **Responder Incorrecta**: 0 puntos
   - **Pasar Palabra**: La letra vuelve en el siguiente turno
   - **Completar sin errores**: +20 puntos bonus

### 3. **Tabla General**
   - Puedes ver la puntuación en tiempo real durante el juego
   - Haz clic en "Ver Puntuación" para mostrar/ocultar la tabla

### 4. **Final del Torneo**
   - Cuando terminen todas las fases, se mostrará el ganador
   - Ranking completo con medallas
   - Opción para iniciar un nuevo torneo

## 📊 Sistema de Puntuación

```
Pasapalabras:
- Respuesta correcta: 10 pts
- Respuesta incorrecta: 0 pts
- Completar sin errores: +20 pts bonus

Total de Fase 1: hasta 270 puntos (26 * 10 + 20 bonus)
```

## 🎨 Personalización

### Cambiar Preguntas del Pasapalabras

Edita el archivo `src/data/mockData.js`:

```javascript
export const pasapalabrasData = [
  {
    letter: "A",
    question: "Tu pregunta aquí",
    answer: "respuesta"
  },
  // ... más preguntas
];
```

### Agregar Nuevas Fases

1. Crea un nuevo componente en `src/components/phases/`
2. Actualiza `PhaseManager.js` para agregar la fase
3. El contexto de torneo maneja automáticamente la puntuación

## 🌟 Características Bonus

- ✨ **Animaciones CSS**: Transiciones suaves entre pantallas
- 🎨 **Diseño Moderno**: Gradientes, sombras y efectos visuales
- 📱 **Responsive Design**: Funciona perfectamente en móviles
- 🏆 **Sistema de Pódium**: Visualización impresionante del ganador
- 💾 **Datos en Memoria**: Los puntos persisten mientras la app está abierta

## 🛠️ Tecnologías Utilizadas

- **React 18** con Hooks
- **CSS3** (Grid, Flexbox, Animaciones)
- **Context API** para estado global
- **JavaScript ES6+**

## 📱 Responsividad

La aplicación está completamente optimizada para:
- 🖥️ Desktop (1024px+)
- 📱 Tablet (768px - 1023px)
- 📱 Mobile (< 768px)

## ⚡ Próximas Fases (Preparadas)

El sistema está listo para agregar:
- Fase 2: Preguntas de Opción Múltiple
- Fase 3: Trivia en Tiempo Real
- Fase 4: Batalla de Equipos

## 🤝 Contribuciones

¿Quieres agregar más preguntas o fases? ¡Edita los archivos directamente!

## 📝 Licencia

Libre para usar y modificar. ¡Hecho con ❤️ para tu grupo de amigos!

## 🎉 ¡A Divertirse!

Descarga, personaliza y juega con tus amigos. Que gane el mejor trivia conocedor. 🏆
