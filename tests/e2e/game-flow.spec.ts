import { expect, test, type Page } from '@playwright/test';

async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/games')
      && response.request().method() === 'POST',
  );

  await page.getByLabel(/nombre del capitán/i).fill('Marina');
  await page.getByRole('button', { name: /iniciar partida/i }).click();

  expect((await responsePromise).status()).toBe(201);
  await expect(page.getByText(/ronda 1 de 10/i)).toBeVisible();
}

async function sendAction(page: Page, action: () => Promise<void>): Promise<void> {
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/actions')
      && response.request().method() === 'POST',
  );

  await action();
  expect((await responsePromise).status()).toBe(200);
  await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false');
}

test('starts a game through the real Express API', async ({ page }) => {
  await startGame(page);

  await expect(page.getByRole('gridcell')).toHaveCount(49);
  const statusBar = page.locator('.status-bar');
  await expect(statusBar.getByText('Marea', { exact: true })).toBeVisible();
  await expect(statusBar.locator('dd').first()).toHaveText(/baja|creciente|alta|bajante/i);

  const participants = page.getByRole('region', { name: 'Participantes' });
  const playerPanel = participants.locator('article').first();
  const rivalPanel = participants.locator('article').nth(1);
  await expect(participants.locator('article')).toHaveCount(2);
  await expect(playerPanel.getByRole('heading', { name: 'Marina' })).toBeVisible();
  await expect(playerPanel.locator('dd').first()).toHaveText('0');
  await expect(rivalPanel.getByRole('heading', { name: 'Rival' })).toBeVisible();
  await expect(rivalPanel.locator('dd').first()).toHaveText('0');
});

test('keeps tile labels and ship identity legible at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await startGame(page);

  const board = page.getByRole('grid', { name: 'Tablero marítimo' });
  const marketLabel = board.getByText('Mercado', { exact: true }).first();
  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 812 });
    await expect(marketLabel).toBeVisible();
    const labelFontSize = await marketLabel.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(labelFontSize).toBeGreaterThanOrEqual(8);
    const clippedLabels = await board.locator('.tile-name').evaluateAll((labels) => labels
      .filter((label) => {
        const tile = label.closest('.tile');
        if (!tile || label.scrollWidth > label.clientWidth) return true;
        const labelBounds = label.getBoundingClientRect();
        const tileBounds = tile.getBoundingClientRect();
        return labelBounds.left < tileBounds.left
          || labelBounds.right > tileBounds.right
          || labelBounds.top < tileBounds.top
          || labelBounds.bottom > tileBounds.bottom;
      })
      .map((label) => label.textContent));
    expect(clippedLabels).toEqual([]);
    await expect(board.locator('.ship--player b')).toBeVisible();
  }
});

test('moves, loads and sells through the real Express API', async ({ page }) => {
  await startGame(page);
  const playerPanel = page.getByRole('region', { name: 'Participantes' }).locator('article').first();
  const playerCoins = playerPanel.locator('dd').first();

  await expect(playerCoins).toHaveText('0');
  await sendAction(page, () => page.getByRole('button', { name: /casilla 6, 1:/i }).click());
  await sendAction(page, () => page.getByRole('button', { name: /casilla 5, 1:/i }).click());
  await expect(page.getByText(/ronda 2 de 10/i)).toBeVisible();

  await sendAction(page, () => page.getByRole('button', { name: /^cargar$/i }).click());
  await expect(page.getByRole('list', { name: /carga de marina/i })).toContainText('Pescado');
  await sendAction(page, () => page.getByRole('button', { name: /casilla 5, 0:/i }).click());
  await expect(page.getByText(/ronda 3 de 10/i)).toBeVisible();

  await sendAction(page, () => page.getByRole('button', { name: /casilla 6, 0:/i }).click());
  await sendAction(page, () => page.getByRole('button', { name: /vender pescado/i }).click());
  await expect(page.getByText(/ronda 4 de 10/i)).toBeVisible();
  await expect(playerCoins).not.toHaveText('0');
});
