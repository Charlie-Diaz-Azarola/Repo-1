/* Arciprestazgo de Valdemoro — apertura de secciones cifradas */
(function () {
  "use strict";
  var C = window.CIFRADO;
  if (!C) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var d64 = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); };
  var e64 = function (u) { var s = ""; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };

  var PREFIJO = "clave:" + C.seccion + ":";
  var NOMBRE = PREFIJO + C.sal;
  var clave = null;

  function leer(store) { try { return window[store].getItem(NOMBRE); } catch (e) { return null; } }
  function escribir(store, v) { try { window[store].setItem(NOMBRE, v); } catch (e) {} }
  function limpiar(todo) {
    ["sessionStorage", "localStorage"].forEach(function (store) {
      try {
        var s = window[store], borrar = [];
        for (var i = 0; i < s.length; i++) {
          var k = s.key(i);
          if (k && k.indexOf(PREFIJO) === 0 && (todo || k !== NOMBRE)) borrar.push(k);
        }
        borrar.forEach(function (k) { s.removeItem(k); });
      } catch (e) {}
    });
  }

  function derivar(pw) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pw.normalize("NFC")), "PBKDF2", false, ["deriveBits"])
      .then(function (base) {
        return crypto.subtle.deriveBits({ name: "PBKDF2", salt: d64(C.sal), iterations: C.iter, hash: "SHA-256" }, base, 256);
      })
      .then(function (bits) { return new Uint8Array(bits); });
  }

  function abrir(raw) {
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]).then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: d64(C.iv) }, k, d64(C.datos)).then(function (pt) {
        clave = k;
        return JSON.parse(new TextDecoder().decode(pt));
      });
    });
  }

  function mostrar(obj) {
    var z = $("#zona-protegida");
    z.innerHTML = obj.html + '<p class="salir"><button type="button" id="salir">Cerrar sesión</button></p>';
    $("#salir").addEventListener("click", function () { limpiar(true); location.reload(); });
    iniciarPestanas(z);
    iniciarReuniones(z);
    iniciarFiltros(z);
    iniciarDescargas(z);
  }

  /* ---------- pestañas ---------- */
  function iniciarPestanas(z) {
    var botones = $$(".pestanas [data-tab]", z);
    if (!botones.length) return;
    function activar(nombre, empujar) {
      if (!botones.some(function (b) { return b.dataset.tab === nombre; })) nombre = botones[0].dataset.tab;
      botones.forEach(function (b) {
        var on = b.dataset.tab === nombre;
        b.classList.toggle("activo", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$(".panel", z).forEach(function (p) { p.hidden = p.dataset.panel !== nombre; });
      if (empujar) { try { history.replaceState(null, "", "#" + nombre); } catch (e) {} }
    }
    botones.forEach(function (b) { b.addEventListener("click", function () { activar(b.dataset.tab, true); }); });
    activar(location.hash.replace("#", ""), false);
  }

  /* ---------- reuniones: próximas / celebradas ---------- */
  function iniciarReuniones(z) {
    var plantilla = $("#todas", z);
    if (!plantilla) return;
    var t = new Date();
    var hoy = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    var todas = $$(".reunion", plantilla.content).map(function (n) { return n.cloneNode(true); });
    var prox = todas.filter(function (r) { return r.dataset.fecha >= hoy; })
      .sort(function (a, b) { return a.dataset.fecha < b.dataset.fecha ? -1 : 1; });
    var cel = todas.filter(function (r) { return r.dataset.fecha < hoy; })
      .sort(function (a, b) { return a.dataset.fecha > b.dataset.fecha ? -1 : 1; });
    prox.forEach(function (r, i) {
      r.classList.add("proxima");
      if (i === 0) r.classList.add("siguiente");
      $(".estado", r).textContent = r.dataset.fecha === hoy ? "Hoy" : (i === 0 ? "Próxima reunión" : "Convocada");
      $(".orden", r).open = true;
      $("#proximas .lista", z).appendChild(r);
    });
    cel.forEach(function (r) {
      r.classList.add("celebrada");
      $(".estado", r).textContent = "Celebrada";
      $(".acta", r).open = !$(".acta .vacio", r);
      $("#celebradas .lista", z).appendChild(r);
    });
    $("#proximas", z).classList.toggle("vacia", !prox.length);
    $("#celebradas", z).classList.toggle("vacia", !cel.length);
  }

  /* ---------- filtro de comunicaciones ---------- */
  function iniciarFiltros(z) {
    var chips = $$(".chip", z);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) { x.classList.toggle("activo", x === c); });
        var org = c.dataset.org;
        $$(".comunicacion", z).forEach(function (a) { a.hidden = !!org && a.dataset.org !== org; });
      });
    });
  }

  /* ---------- descargas cifradas ---------- */
  function iniciarDescargas(z) {
    $$(".archivo", z).forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.classList.contains("cargando")) return;
        b.classList.add("cargando");
        b.classList.remove("error");
        fetch("d/" + b.dataset.id + ".bin")
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(function (buf) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: d64(b.dataset.iv) }, clave, buf); })
          .then(function (pt) {
            var url = URL.createObjectURL(new Blob([pt], { type: b.dataset.mime }));
            var a = document.createElement("a");
            a.href = url; a.download = b.dataset.nombre;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
          })
          .catch(function () {
            b.classList.add("error");
            b.title = "No se pudo descargar el archivo. Inténtelo de nuevo.";
          })
          .then(function () { b.classList.remove("cargando"); });
      });
    });
  }

  /* ---------- formulario ---------- */
  var form = $("#form-candado"), msg = $("#mensaje"), campo = $("#clave");
  if (!window.crypto || !crypto.subtle) {
    msg.textContent = "Su navegador no permite abrir esta sección. Pruebe con un navegador actualizado.";
    return;
  }
  limpiar(false);

  var guardada = leer("sessionStorage") || leer("localStorage");
  if (guardada) {
    abrir(d64(guardada)).then(mostrar).catch(function () { limpiar(true); });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pw = campo.value;
    if (!pw) return;
    form.classList.add("comprobando");
    msg.textContent = "Comprobando…";
    derivar(pw).then(function (raw) {
      return abrir(raw).then(function (obj) {
        var v = e64(raw);
        escribir("sessionStorage", v);
        if ($("#recordar").checked) escribir("localStorage", v);
        mostrar(obj);
      });
    }).catch(function () {
      form.classList.remove("comprobando");
      msg.textContent = "Contraseña incorrecta.";
      campo.select();
    });
  });
})();
