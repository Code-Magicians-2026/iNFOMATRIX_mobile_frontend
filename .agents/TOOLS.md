# Tools & CLI Conventions
- Ми використовуємо виключно `npm` як пакетний менеджер. Не використовуй `yarn` або `pnpm`.
- Якщо ти отримуєш помилку "node: command not found", перед запуском тестів або лінтера ініціалізуй середовище (наприклад, на Mac/Linux виконай `source ~/.nvm/nvm.sh` перед командою, або використовуй `npx`).
- Для запуску тестів використовуй команду: `npm run test` (або `npm run lint`).
- Для встановлення пакетів використовуй `npx expo install <package_name>` (це гарантує сумісність версій в Expo) або `npm install`.
- Для запуску проєкту на Android емуляторі або пристрої використовуй: `npx expo start --android`.
- Якщо потрібно очистити кеш бандлера: `npm start -- --reset-cache` (або `npx expo start -c`).