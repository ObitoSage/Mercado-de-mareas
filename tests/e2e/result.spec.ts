import { expect, test } from '@playwright/test';

test('finishes after ten rounds and presents both fortunes', async ({ page }) => {
  await page.goto('/');
  const createResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith('/api/games')
      && response.request().method() === 'POST',
  );
  await page.getByLabel(/nombre del capitán/i).fill('Marina');
  await page.getByRole('button', { name: /iniciar partida/i }).click();
  expect((await createResponsePromise).status()).toBe(201);
  await expect(page.getByText(/ronda 1 de 10/i)).toBeVisible();

  for (let round = 1; round <= 10; round += 1) {
    const endTurn = page.getByRole('button', { name: /terminar turno/i });
    await expect(endTurn).toBeEnabled();
    const actionResponsePromise = page.waitForResponse(
      (response) => response.url().endsWith('/actions')
        && response.request().method() === 'POST',
    );
    await endTurn.click();
    expect((await actionResponsePromise).status()).toBe(200);

    if (round < 10) {
      await expect(page.getByText(new RegExp(`ronda ${round + 1} de 10`, 'i'))).toBeVisible();
    }
  }

  await expect(page.getByRole('heading', { name: /victoria|derrota|empate/i })).toBeVisible();
  await expect(page.getByText(/riqueza de marina: \d+/i)).toBeVisible();
  await expect(page.getByText(/riqueza del rival: \d+/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /jugar otra vez/i })).toBeVisible();
});
