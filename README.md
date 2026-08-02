# White Smoke

Витрина вейп и табачной продукции для **г. Дзержинск** (Нижегородская обл.): каталог и остатки из [МойСклад](https://www.moysklad.ru/), резерв самовывоза в одном из трёх магазинов или доставка по городу. Оплата на сайте — на следующем этапе.

## Стек

- Nuxt 4
- Nuxt UI 4 + Tailwind CSS 4
- МойСклад JSON API 1.2

## Быстрый старт

```bash
cp .env.example .env
npm install
npm run dev
```

Без `MOYSKLAD_TOKEN` сайт работает в **демо-режиме** (тестовый каталог и локальные «заказы»).

## Настройка МойСклад

1. Создайте токен API в МойСклад и пропишите `MOYSKLAD_TOKEN`.
2. Узнайте UUID организации: `GET https://api.moysklad.ru/api/remap/1.2/entity/organization` → `MOYSKLAD_ORGANIZATION_ID`.
3. UUID трёх складов: `GET .../entity/store` → `MOYSKLAD_STORE_1_ID` … `_3_ID`.  
   Если UUID не заданы, приложение само подтянет до трёх складов из МойСклад.
4. При необходимости уточните адреса/телефоны (`STORE_*`).

Витрина и остатки по магазинам читаются из МойСклад (`assortment` + `report/stock/bystore`). Без токена показывается демо-каталог.

При оформлении заказа создаётся **заказ покупателя** с резервом позиций на выбранном складе (или на складе №1 для доставки). Контрагент ищется/создаётся по телефону.

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Разработка |
| `npm run build` | Сборка |
| `npm run preview` | Превью production-сборки |

## GitHub Pages (демо)

Статический демо-сайт: [arnollder.github.io/white-smoke](https://arnollder.github.io/white-smoke/).

- Workflow: `.github/workflows/deploy-pages.yml` (push в `main` или **Run workflow**)
- Без секретов собирается **демо-каталог**; для витрины из МойСклад добавьте в repo secrets: `MOYSKLAD_TOKEN`, `MOYSKLAD_ORGANIZATION_ID`, `MOYSKLAD_STORE_*_ID`
- На Pages нет серверного API: заказ покупателя не создаётся (корзина для демонстрации UX)

В настройках репозитория: **Settings → Pages → Source: GitHub Actions**.

## Возраст 18+

При первом визите показывается подтверждение возраста (localStorage).
