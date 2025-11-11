/**
 * Muestra una página específica del formulario y oculta las demás.
 * @param {string} pageId - El ID del elemento div de la página a mostrar (ej: 'hoja1').
 */
function showPage(pageId) {
    // Oculta todas las páginas
    var pages = document.querySelectorAll('.survey-page');
    pages.forEach(function (page) {
        page.style.display = 'none';
    });

    // Muestra la página deseada
    var activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.style.display = 'block';
    }
}

// --- NUEVA FUNCIÓN (Añadir a scripts.js) ---

/**
 * Actualiza el texto que muestra la edad seleccionada en el slider.
 * @param {string} value - El valor actual del slider (0-100).
 */
function updateEdadOutput(value) {
    const output = document.getElementById('edad-output');
    if (value == 0) {
        output.innerText = "< 1";
    } else if (value == 100) {
        output.innerText = "99+";
    } else {
        output.innerText = value;
    }
}

/**
 * Calcula el puntaje total de peligro basado en las selecciones del formulario
 * y actualiza el marcador superior.
 */
function calculateScore() {
    let totalScore = 0;

    // --- Hoja 2: Edad ---
    // Usamos '|| 0' para que si el campo está vacío, cuente como 0
    let edad = parseInt(document.getElementById('edad').value) || 0;

    // Aquí defines tus reglas de puntaje
    if (edad <= 1) {
        totalScore += 15;
    } else if (edad >= 90) {
        totalScore += 6;
    } else if (edad >= 30 && edad < 90) {
        totalScore += 2;
    }

    // --- Hoja 2: Embarazo ---
    if (document.getElementById('emb_si').checked) {
        totalScore += 30;
    }

    // --- Hoja 3: Síntomas Graves ---
    if (document.getElementById('sintomas_si').checked) {
        totalScore += 50;
    }

    // --- Hoja 4: Problemas (Checkboxes) ---
    if (document.getElementById('p_resp').checked) { totalScore += 5; }
    if (document.getElementById('p_neuro').checked) { totalScore += 15; }
    if (document.getElementById('p_lesion').checked) { totalScore += 10; }
    if (document.getElementById('p_fiebre').checked) { totalScore += 5; }
    if (document.getElementById('p_dolor').checked) { totalScore += 3; }

    // Actualizamos el marcador superior
    document.getElementById('score-value').innerText = totalScore;
}

/**
 * Se llama al presionar 'Ver Resultados'.
 * Calcula el Triage y muestra la hoja final.
 */
function mostrarResultados() {
    // 1. Recalcula por si acaso
    calculateScore();

    // 2. Toma el valor del marcador superior (como NÚMERO)
    let finalScore = parseInt(document.getElementById('score-value').innerText);

    // 3. Pone ese valor en la hoja final
    document.getElementById('final-score-value').innerText = finalScore;

    // --- Lógica de Triage ---
    let levelText = "";
    let levelColor = "";

    // !!! IMPORTANTE: Ajusta estos rangos de puntaje según tu criterio !!!
    if (finalScore >= 40) {
        levelText = "🔴 Rojo (0 min)";
        levelColor = "#e74c3c"; // Rojo
    } else if (finalScore >= 20) {
        levelText = "🟠 Naranja (≤10 min)";
        levelColor = "#e67e22"; // Naranja
    } else if (finalScore >= 10) {
        levelText = "🟡 Amarillo (≤60 min)";
        levelColor = "#f1c40f"; // Amarillo
    } else if (finalScore >= 3) {
        levelText = "🟢 Verde (≤120 min)";
        levelColor = "#2ecc71"; // Verde
    } else {
        levelText = "🔵 Azul (≤240 min)";
        levelColor = "#3498db"; // Azul
    }

    // 4. Selecciona el nuevo elemento HTML
    let triageElement = document.getElementById('final-triage-level');

    // 5. Asigna el texto (con innerHTML para los emojis) y el color
    triageElement.innerHTML = levelText;
    triageElement.style.color = levelColor;
    // --- FIN LÓGICA TRIAGE ---

    // 6. Oculta el marcador superior
    document.getElementById('score-display').style.display = 'none';

    // 7. Muestra la página final
    showPage('hojaFinal');
}

/**
 * Se llama al presionar 'Reiniciar Encuesta'.
 * Resetea el formulario, recalcula (a 0) y vuelve a la hoja 1.
 */
function reiniciarEncuesta() {
    // 1. Resetea todos los campos del formulario
    document.getElementById('multiStepForm').reset();

    // 2. Recalcula el puntaje (ahora será 0)
    calculateScore();

    // 3. Vuelve a mostrar el marcador superior
    document.getElementById('score-display').style.display = 'block';

    // 4. Limpia el texto de triage de la hoja final
    document.getElementById('final-triage-level').innerHTML = "";

    // 5. Muestra la primera hoja
    showPage('hoja1');
}



/**
 * Simula el envío de la narración (aquí es donde iría el fetch a n8n)
 * y actualiza los botones de la interfaz.
 */


function enviarNarrativa() {
    // 1. Declaración ÚNICA de la variable.
    const narrativaTexto = document.getElementById('narrativa').value;

    // AÑADE ESTAS LÍNEAS PARA PROBAR
    console.log("✅ Proceso de Envío Iniciado.");
    console.log("Texto de Narrativa a enviar:", narrativaTexto);

    // 🔗 Enviamos el texto al webhook de n8n
    fetch("https://creactivehub.app.n8n.cloud/webhook-test/from-ghpages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            narrativa: narrativaTexto,
            origen: "github-pages"
        })
    })
        .then(response => response.text())
        .then(data => console.log("Respuesta de n8n:", data))
        .catch(error => console.error("Error al enviar:", error));

    // Ocultar botones y bloquear textarea
    document.getElementById('narrative-buttons').style.display = 'none';
    document.getElementById('narrativa').disabled = true;

    // Mostrar mensaje de éxito
    document.getElementById('after-send-message').style.display = 'block';
}









// --- EVENT LISTENERS ---

// Asegura que la hoja 1 se muestre al cargar la página
document.addEventListener('DOMContentLoaded', function () {
    // Carga la 'hoja1' al inicio
    showPage('hoja1');
});

// Asigna los listeners al formulario para recalcular el puntaje
const form = document.getElementById('multiStepForm');

// Se activa cuando haces clic en un radio o checkbox
form.addEventListener('change', calculateScore);

// Se activa CADA VEZ que escribes una letra en un campo (como la edad)
form.addEventListener('input', calculateScore);
