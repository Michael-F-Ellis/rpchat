const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('RPChat Top/Bottom Scroll Buttons', () => {

	test.beforeEach(async ({ page }) => {
		// Navigate to the local index.html directly
		const indexPath = path.resolve(__dirname, '..', 'index.html');
		await page.goto(`file://${indexPath}`);
	});

	test('scroll buttons should appear when scrollable and jump to correct positions', async ({ page }) => {
		// Check that the buttons exist in the DOM inside the header title
		const btnTop = page.locator('#scroll-top');
		const btnBottom = page.locator('#scroll-bottom');

		await expect(btnTop).toHaveCount(1);
		await expect(btnBottom).toHaveCount(1);

		// Initial state: page might not be scrollable, but let's inject a lot of text to force scroll
		await page.evaluate(() => {
			const container = document.getElementById('chat-container');
			for (let i = 0; i < 50; i++) {
				const div = document.createElement('div');
				div.style.height = '100px';
				div.textContent = `Test message line ${i}`;
				container.appendChild(div);
			}
		});

		// Make sure we have injected enough to scroll inside the chat container
		const scrollHeight = await page.evaluate(() => document.getElementById('chat-container').scrollHeight);
		const clientHeight = await page.evaluate(() => document.getElementById('chat-container').clientHeight);
		expect(scrollHeight).toBeGreaterThan(clientHeight);

		// Manually scroll to top to begin
		await page.evaluate(() => document.getElementById('chat-container').scrollTo(0, 0));
		await page.waitForTimeout(100);

		// Click bottom button
		await btnBottom.click();
		await page.waitForTimeout(1000); // Wait for smooth scroll

		// Assert we're near the bottom of the container
		const limit = await page.evaluate(() => {
			const c = document.getElementById('chat-container');
			return c.scrollHeight - c.clientHeight;
		});
		const currentScrollYAfterBottom = await page.evaluate(() => document.getElementById('chat-container').scrollTop);

		// Allow a small margin of error for fractional pixels
		expect(currentScrollYAfterBottom).toBeGreaterThanOrEqual(limit - 5);

		// Click top button
		await btnTop.click();
		await page.waitForTimeout(1000); // Wait for smooth scroll

		// Assert we're back at the top of the container
		const currentScrollYAfterTop = await page.evaluate(() => document.getElementById('chat-container').scrollTop);
		expect(currentScrollYAfterTop).toBeLessThanOrEqual(10);
	});
});
