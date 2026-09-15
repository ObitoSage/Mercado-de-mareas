import { expect, test } from '@playwright/test';

test('keeps the authoritative state after an invalid action', async ({ page }) => {
  await page.goto('/');
  const createResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/games')
      && response.request().method() === 'POST',
  );
  await page.getByLabel(/nombre del capitán/i).fill('Marina');
  await page.getByRole('button', { name: /iniciar partida/i }).click();
  expect((await createResponsePromise).status()).toBe(201);
  await expect(page.getByText(/ronda 1 de 10/i)).toBeVisible();

  const statusBar = page.locator('.status-bar');
  const playerPanel = page.getByRole('region', { name: 'Participantes' }).locator('article').first();
  const round = statusBar.locator('.round-label');
  const actionPoints = statusBar.locator('dd').nth(2);
  const position = playerPanel.locator('dd').nth(1);

  await expect(round).toHaveText('Ronda 1 de 10');
  await expect(actionPoints).toHaveText('2');
  await expect(position).toHaveText('6, 0');

  const actionResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/actions')
      && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /^cargar$/i }).click();
  expect((await actionResponsePromise).status()).toBe(409);

  await expect(page.getByRole('alert')).toContainText(/puerto de abastecimiento/i);
  await expect(round).toHaveText('Ronda 1 de 10');
  await expect(actionPoints).toHaveText('2');
  await expect(position).toHaveText('6, 0');
});
