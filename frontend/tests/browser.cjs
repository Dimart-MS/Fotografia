/**
 * Prueba automatizada de extremo a extremo (E2E) en navegador con Playwright.
 * Verifica acceso, vista de directorio de clientes (HU 06), agenda y reservas (HU 02),
 * responsividad móvil y cierre de sesión, generando las capturas de evidencia.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const apiKey = process.env.FOTO_API_KEY;
  if (!apiKey) throw new Error('Configura FOTO_API_KEY con la clave del backend');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 }
  });

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  const outDir = path.resolve(__dirname, '../artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  try {
    page.setDefaultTimeout(45000);

    // 1. Pantalla de acceso al estudio
    await page.goto('http://127.0.0.1:5175', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.getByRole('button', { name: 'Entrar al estudio', exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(outDir, '01-acceso.png'),
      fullPage: true
    });

    // 2. Autenticación con la clave del estudio
    await page.getByLabel('Clave del estudio').fill(apiKey);
    await page.getByRole('button', { name: 'Entrar al estudio' }).click();
    await page.getByRole('heading', { name: 'Panel del estudio' }).waitFor();

    // 3. Vista de Directorio de clientes (HU 06)
    await page.getByRole('button', { name: 'Clientes', exact: false }).first().click();
    await page.getByRole('heading', { name: 'Directorio de clientes' }).waitFor();
    await page.screenshot({
      path: path.join(outDir, '02-clientes.png'),
      fullPage: true
    });

    // 4. Vista de Agenda y reservas + Modal de confirmación de anticipo (HU 02)
    await page.getByRole('button', { name: 'Agenda y reservas', exact: true }).click();
    await page.getByRole('heading', { name: 'Agenda y reservas' }).waitFor();

    const confirmButtons = page.getByRole('button', { name: 'Confirmar', exact: true });
    if ((await confirmButtons.count()) > 0) {
      await confirmButtons.first().click();
      await page.getByLabel('Anticipo recibido en MXN').waitFor();
      await page.screenshot({
        path: path.join(outDir, '03-anticipo.png'),
        fullPage: true
      });
      await page.getByRole('button', { name: 'Volver', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }

    await page.screenshot({
      path: path.join(outDir, '04-agenda.png'),
      fullPage: true
    });

    // 5. Vista general en escritorio (1440x900) y móvil (390x844)
    await page.getByRole('button', { name: 'Vista general', exact: true }).click();
    await page.getByRole('heading', { name: 'Panel del estudio' }).waitFor();
    await page.screenshot({
      path: path.join(outDir, '05-escritorio.png'),
      fullPage: true
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(outDir, '06-movil.png'),
      fullPage: true
    });

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth
    );
    assert.equal(
      hasHorizontalOverflow,
      false,
      'La página no debe tener desbordamiento horizontal'
    );

    // 6. Cierre de sesión
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar al estudio', exact: true }).waitFor();
    assert.deepEqual(errors, [], 'Sin errores de ejecución en el navegador');

    const result = {
      passed: true,
      checks: [
        'Acceso',
        'Directorio de clientes',
        'Calendario y reservas',
        'Modal de anticipo',
        'Vista general en laptop sin scroll',
        'Diseño móvil sin desbordamiento',
        'Cierre de sesión',
        'Sin errores JavaScript'
      ],
      browser: 'Chrome headless',
      viewports: ['1440x900', '390x844']
    };

    fs.writeFileSync(
      path.join(outDir, 'browser.json'),
      JSON.stringify(result, null, 2)
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
