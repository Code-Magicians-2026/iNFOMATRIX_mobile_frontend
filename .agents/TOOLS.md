# Tools & CLI Conventions
- Ми використовуємо виключно `npm` як пакетний менеджер. Не використовуй `yarn` або `pnpm`.
- Для встановлення пакетів використовуй `npx expo install <package_name>` (це гарантує сумісність версій в Expo) або `npm install`.
- Для запуску проєкту на Android емуляторі або пристрої використовуй: `npx expo start --android`.
- Якщо потрібно очистити кеш бандлера: `npm start -- --reset-cache` (або `npx expo start -c`).