// Tu URL de Google Apps Script (la que termina en /exec)
const URL_SCRIPT_GOOGLE = 'https://script.google.com/macros/s/AKfycbysTbfQ81e2oEuyJGWfGOaq_DYvTX5XqbuasDcDk0xsNz6ZSI9H4BM9JVosfv6ygKk/exec';
let sintomasScore = {};

// 1. CARGA INICIAL Y RENDERIZADO DINÁMICO
fetch("sintomas.json")
  .then(res => res.json())
  .then(data => {
    sintomasScore = data;
    renderizarSintomas(); // Genera la Hoja 4 automáticamente
  })
  .catch(err => console.error("Error cargando sintomas.json", err));

/**
 * Genera el HTML de la Hoja 4 basándose en el JSON.
 * Crea títulos para los padres y listas para los hijos.
 */

function renderizarSintomas() {
    const contenedor = document.getElementById('contenedor-sintomas');
    if (!contenedor) return;
    contenedor.innerHTML = ''; // Limpiar contenedor

    Object.entries(sintomasScore).forEach(([idPadre, info]) => {
        // FILTRO: Solo procesar IDs que empiecen con 'p_' y omitir config_puntajes
        if (!idPadre.startsWith('p_')) return;

        // Creamos el bloque del síntoma principal (Padre)
        const divPadre = document.createElement('div');
        divPadre.className = 'grupo-sintoma';

        // Usamos la propiedad 'texto' del JSON o transformamos el ID si no existe
        const nombreMostrar = info.texto || idPadre.replace('p_', '').toUpperCase();

        // Mantenemos solo el display:none en línea porque JS lo necesita para ocultar/mostrar
        divPadre.innerHTML = `
            <div class="padre-row">
                <input type="checkbox" id="${idPadre}" onchange="toggleHijos('${idPadre}')">
                <label for="${idPadre}"><strong>${nombreMostrar}</strong></label>
            </div>
            <div id="sub_${idPadre}" class="hijos-container" style="display:none;">
            </div>
        `;

        contenedor.appendChild(divPadre);

        // Si el padre tiene hijos, los renderizamos dentro de su contenedor
        if (info.children) {
            const subContenedor = divPadre.querySelector(`#sub_${idPadre}`);
            Object.entries(info.children).forEach(([idHijo, infoHijo]) => {
                const nombreHijo = (typeof infoHijo === 'object' ? infoHijo.texto : idHijo.replace(/_/g, ' '));
                
                const divHijo = document.createElement('div');
                divHijo.className = 'hijo-item'; // <-- Aplicamos tu clase CSS aquí
                
                divHijo.innerHTML = `
                    <input type="checkbox" id="${idHijo}" onchange="calculateScore()">
                    <label for="${idHijo}">${nombreHijo}</label>
                `;
                subContenedor.appendChild(divHijo);
            });
        }
    });
}



/**
 * Reset completo del sistema
 */
function reiniciarEncuesta() {
    // 1. Limpiar todos los campos del formulario
    document.getElementById('multiStepForm').reset();
    
    // 2. Volver a mostrar el marcador de puntos (por si se ocultó)
    document.getElementById('score-display').style.display = 'block';
    
    // 3. OCULTAR el mensaje de éxito del registro anterior (IMPORTANTE)
    const msgRegistro = document.getElementById('msg-registro-exitoso');
    if (msgRegistro) msgRegistro.style.display = 'none';

    // 4. Resetear la parte de la narrativa
    document.getElementById('narrativa').disabled = false;
    document.getElementById('narrative-buttons').style.display = 'block';
    document.getElementById('after-send-message').style.display = 'none';
    
    // 5. Ocultar todos los subcontenedores de síntomas (acordeones)
    document.querySelectorAll('.hijos-container').forEach(c => c.style.display = 'none');
    
    // 6. Resetear el marcador a 0 y volver al inicio
    calculateScore();
    showPage('hoja1');
}


function enviarAlExcel() {
    const dniVal = document.getElementById('dni').value;
    const nombreVal = document.getElementById('nombre_reg').value;
    const scoreVal = document.getElementById('score-value').innerText;

    if (!dniVal) {
        alert("Por favor, ingresa el DNI.");
        return;
    }

    const urlFinal = `${URL_SCRIPT_GOOGLE}?tipo=registro&id=${encodeURIComponent(dniVal)}&nombre=${encodeURIComponent(nombreVal)}&puntaje=${encodeURIComponent(scoreVal)}`;

    // Usamos el modo no-cors para evitar problemas de seguridad del navegador
    fetch(urlFinal, { mode: 'no-cors' })
    .then(() => {
        document.getElementById('msg-registro-exitoso').style.display = 'block';
        mostrarResultados();
    })
    .catch(err => {
        console.error("Error en el envío:", err);
        mostrarResultados();
    });
}


/**
 * Muestra/Oculta los subtítulos y recalcula el puntaje
 */
function toggleHijos(idPadre) {
    const checkboxPadre = document.getElementById(idPadre);
    const subContenedor = document.getElementById(`sub_${idPadre}`);
    
    if (subContenedor) {
        // CAMBIO: Usamos 'grid' para activar las dos columnas del CSS
        subContenedor.style.display = checkboxPadre.checked ? 'grid' : 'none';
        
        // Si desmarcamos al padre, desmarcamos automáticamente a todos los hijos
        if (!checkboxPadre.checked) {
            const hijos = subContenedor.querySelectorAll('input[type="checkbox"]');
            hijos.forEach(h => h.checked = false);
        }
    }
    // Recalcular el puntaje siempre al final
    calculateScore();
}

/**
 * Cambia entre páginas (SPA)
 */
function showPage(pageId) {
    document.querySelectorAll('.survey-page').forEach(page => {
        page.style.display = 'none';
    });
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.style.display = 'block';
}

/**
 * Actualiza el slider de edad
 */
function updateEdadOutput(value) {
    const output = document.getElementById('edad-output');
    output.innerText = (value == 0) ? "< 1" : (value == 100) ? "99+" : value;
}

/**
 * CÁLCULO DE PUNTAJE (Lógica jerárquica)
 */


function calculateScore() {
    let totalScore = 0;
    const config = sintomasScore.config_puntajes; // Acceso a la nueva configuración

    if (config) {
        // 1. Puntaje por Edad Dinámico
        let edad = parseInt(document.getElementById('edad').value) || 0;
        const rangoEncontrado = config.edad.find(rango => edad >= rango.min && edad <= rango.max);
        if (rangoEncontrado) {
            totalScore += rangoEncontrado.puntos;
        }

        // 2. Embarazo Dinámico
        if (document.getElementById('emb_si').checked) {
            totalScore += config.embarazo;
        }

        // 3. Síntomas Graves Dinámico
        if (document.getElementById('sintomas_si').checked) {
            totalScore += config.graves;
        }
    }


    // 4. Síntomas Dinámicos (Padres e Hijos) - Se mantiene igual
    Object.entries(sintomasScore).forEach(([idPadre, info]) => {
        // Filtramos para no procesar la "config_puntajes" como si fuera un síntoma
        if (idPadre.startsWith('p_')) { 
            const checkPadre = document.getElementById(idPadre);
            if (checkPadre && checkPadre.checked) {
                totalScore += (info.score || 0);
                if (info.children) {
                    Object.entries(info.children).forEach(([idHijo, infoHijo]) => {
                        const checkHijo = document.getElementById(idHijo);
                        if (checkHijo && checkHijo.checked) {
                            totalScore += (infoHijo.score || 0);
                        }
                    });
                }
            }
        }
    });

    document.getElementById('score-value').innerText = totalScore;
}




/**
 * Muestra los resultados finales según el puntaje
 */
function mostrarResultados() {
    calculateScore();
    const finalScore = parseInt(document.getElementById('score-value').innerText);
    document.getElementById('final-score-value').innerText = finalScore;

    let levelText = "";
    let levelColor = "";

    if (finalScore >= 40) { levelText = "🔴 Rojo (Atención Inmediata)"; levelColor = "#e74c3c"; }
    else if (finalScore >= 20) { levelText = "🟠 Naranja (Urgencia)"; levelColor = "#e67e22"; }
    else if (finalScore >= 10) { levelText = "🟡 Amarillo (Diferable)"; levelColor = "#f1c40f"; }
    else if (finalScore >= 3) { levelText = "🟢 Verde (No Urgente)"; levelColor = "#2ecc71"; }
    else { levelText = "🔵 Azul (Consulta General)"; levelColor = "#3498db"; }

    const triageElement = document.getElementById('final-triage-level');
    triageElement.innerHTML = levelText;
    triageElement.style.color = levelColor;

    document.getElementById('score-display').style.display = 'none';
    showPage('hojaFinal');
}




/**
 * Reset completo del sistema
 */
function reiniciarEncuesta() {
    document.getElementById('multiStepForm').reset();
    document.getElementById('score-display').style.display = 'block';
    
    // Limpiar mensajes de éxito
    const msgRegistro = document.getElementById('msg-registro-exitoso');
    if (msgRegistro) msgRegistro.style.display = 'none';
    document.getElementById('after-send-message').style.display = 'none';
    
    // Reactivar narrativa
    document.getElementById('narrativa').disabled = false;
    document.getElementById('narrative-buttons').style.display = 'block';
    
    document.querySelectorAll('.hijos-container').forEach(c => c.style.display = 'none');
    calculateScore();
    showPage('hoja1');
}

/**
 * Envio a Excel
 */

function enviarNarrativa() {
    const params = {
        tipo: 'narrativa',
        respondiente: document.querySelector('input[name="respondiente"]:checked')?.value || 'N/A',
        edad: document.getElementById('edad').value,
        sexo: document.querySelector('input[name="sexo"]:checked')?.value || 'N/A',
        embarazo: document.querySelector('input[name="embarazo"]:checked')?.value || 'no',
        narrativa: document.getElementById('narrativa').value,
        puntaje: document.getElementById('score-value').innerText
    };

    const query = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
    const urlFinal = `${URL_SCRIPT_GOOGLE}?${query}`;

    fetch(urlFinal, { mode: 'no-cors' })
    .then(() => {
        document.getElementById('narrative-buttons').style.display = 'none';
        document.getElementById('narrativa').disabled = true;
        document.getElementById('after-send-message').style.display = 'block';
    })
    .catch(err => console.error("Error en narrativa:", err));
}


// Inicialización de Eventos
document.addEventListener('DOMContentLoaded', () => showPage('hoja1'));
const mainForm = document.getElementById('multiStepForm');
mainForm.addEventListener('change', calculateScore);
mainForm.addEventListener('input', calculateScore);
