# Globe Forge

[English](README.md) | [Русский](README.ru.md)

Модуль для [Foundry VTT](https://foundryvtt.com/) v13: интерактивные глобусы игровых миров. Сцена-глобус с векторными тайлами и свободным зумом от планеты до региона; глобусы описываются декларативными манифестами. Первый встроенный мир — Голарион на данных проекта [pf-wikis/mapping](https://github.com/pf-wikis/mapping).

## Возможности

- Кнопка **«Создать глобус»** во вкладке сцен: диалог «мир + имя» создаёт готовую сцену-глобус.
- Полная карта Голариона: границы по типам, подписи регионов и городов, иконки локаций, текущая эпоха данных.
- Звёздное небо вокруг сферы с медленным вращением; задник настраивается в конфигурации сцены (любой CSS-фон).
- Источники данных по приоритету: локальный файл, затем сетевое зеркало — с автоматическим переходом.
- Локализация интерфейса: английский и русский.
- Поля «Глобус» и «Задник глобуса» в базовой вкладке настроек сцены.

## Установка

1. **Add-on Modules → Install Module**.
2. В поле **Manifest URL** вставьте:
   ```
   https://github.com/def-gu/globe-forge/releases/latest/download/module.json
   ```
3. Установите и включите модуль в настройках мира.

## Данные карты

По умолчанию тайлы Голарион загружаются с сетевого зеркала. Для работы офлайн и быстрой загрузки положите файл `golarion.pmtiles` в папку `Data/globe-forge/` вашего пользовательского каталога Foundry — модуль подхватит его автоматически. Файл можно скачать со страницы релизов или с [map.pathfinderwiki.com](https://map.pathfinderwiki.com/golarion.pmtiles).

## Разработка

Чистая математика (мост координат, выбор источников) покрыта тестами:

```
node --test test/geo.test.mjs test/sources.test.mjs
```

## Лицензия и атрибуция

Код — [MIT](LICENSE).

Globe Forge uses trademarks and/or copyrights owned by Paizo Inc., used under [Paizo's Community Use Policy](https://paizo.com/licenses/communityuse). We are expressly prohibited from charging you to use or access this content. Globe Forge is not published, endorsed, or specifically approved by Paizo. Картографические данные Голариона — проект [pf-wikis/mapping](https://github.com/pf-wikis/mapping) и его участники.
