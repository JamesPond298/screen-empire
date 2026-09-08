# Screen Empire

**Screen Empire** is a fictional television and movie studio simulator. It runs entirely in your browser and does not need an account, paid service, or backend.

## Play online

[Open Screen Empire](https://jamespond298.github.io/screen-empire/) on a computer or phone. Progress is saved separately in each browser, so use **Export Save** and **Import Save** when moving a studio between devices.

## Open the game on Windows

1. Open the **Screen Simulator** folder in File Explorer.
2. Double-click **index.html**.
3. If Windows asks which app to use, choose Microsoft Edge or Google Chrome.
4. Enter a production-company name and click **Open the studio**.

The successful result is a dark-blue studio dashboard showing your cash, Week 1, and a gold **Next Week** button.

## Test your first production

1. Click **Productions** in the left menu.
2. Keep the automatically suggested title, click **Generate Another Title**, or type your own.
3. Review “Due when approved,” remaining commitments, total cost, and timing.
4. Click **Greenlight production**. Greenlight means “approve production.”
5. Click the one shared **Next Week** button until the project is released.
6. Open **Catalog & Rights** to see its scores, revenue, costs, and direct profit or loss.
7. Refresh the browser page. Your studio and project should still be there.

## Test the opportunity and progression update

1. Advance a new studio to Week 2 and open **Opportunities**.
2. Accept the paid script assessment, advance one week, and confirm its delivery payment in **Finances**.
3. Complete an original. When its attention card appears, choose the free plan, rehearsal, or audience-positioning option.
4. Open **Career Progress**, choose any new genre, and start a project in it immediately.
5. Read the preliminary release report in **Catalog & Rights** and use actionable links in **News**.

Existing studios receive 100 Studio Experience for each verifiable completed original. Earned genre choices are granted once; cash and historical transactions are not rewritten. A migrated studio also receives an immediately due opportunity check under the normal eligibility rules.

Browser autosaves stay on this browser and device; they are not a cloud account. Use **Save & Settings → Export Save** to download a portable backup.

Changing the format or genre refreshes an automatic suggestion, but never overwrites a title you typed yourself. Existing studios and approved production titles are preserved when the game updates.

## Economy balance update

The ordinary production loop was rebalanced after a 52-week audit. Future weekly overhead is now **$6,000**, small productions finish sooner, movie revenue lasts 12 weeks, and television revenue lasts 14 weeks. The production-planning card now shows allocated overhead, an uncertain revenue range, and a projected result; allocated overhead is a forecast only and is not charged a second time.

Existing studios keep their cash, productions, titles, catalog, and transaction history. The lower overhead applies to future weeks automatically.

## Optional developer test

If Node.js is installed, open PowerShell in this folder and run `npm test`. The suite covers the original economy, opportunity payments, expiration, busy-studio fallback, licensing, production decisions, genre content, save migration, and 100-seed pacing simulations. You do not need this command just to play.
