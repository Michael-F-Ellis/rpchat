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

		// Make sure we have injected enough to scroll
		const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
		const windowHeight = await page.evaluate(() => window.innerHeight);
		expect(scrollHeight).toBeGreaterThan(windowHeight);

		// Manually scroll to top to begin
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForTimeout(100);

		// Click bottom button
		await btnBottom.click();
		await page.waitForTimeout(500); // Wait for smooth scroll

		// Assert we're near the bottom
		const currentScrollYAfterBottom = await page.evaluate(() => window.scrollY);
		const expectedMaxScroll = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);

		// Allow a small margin of error for fractional pixels
		expect(currentScrollYAfterBottom).toBeGreaterThanOrEqual(expectedMaxScroll - 5);

		// Click top button
		await btnTop.click();
		await page.waitForTimeout(500); // Wait for smooth scroll

		// Assert we're back at the top
		const currentScrollYAfterTop = await page.evaluate(() => window.scrollY);
		expect(currentScrollYAfterTop).toBeLessThanOrEqual(5);
	});
});
