---
type: Incident
title: ACP steering прерывает автономную цель Kimi
description: Два исправления автономных turn и ложных пауз в поддерживаемом форке.
status: stable
stale_after: 2026-12-02T00:00:00Z
tags: [kimi, acp, goal, steering, fork]
generated: { by: codex, at: "2026-11-02T08:23:00Z" }
verified: { by: codex, at: "2026-11-02T08:23:00Z" }
sources:
  - id: regression-tests
    resource: ../../native-steer.test.ts
    title: Реальный BB bridge и синтетический ACP subprocess
  - id: kimi-patches
    resource: ../../patches/kimi-code/combined.patch
    title: Регрессионные тесты и исправления Kimi 2.4.1
  - id: upstream-issue
    resource: https://github.com/dpolishuk/bb-kimi-code/issues/8
    title: Потеря autonomous updates и premature completion
---

SDK 0.6.90 реализует `turn/steer` через cancel текущего ACP prompt и новый prompt. Для Kimi cancel одновременно ставит активную goal на паузу. Поэтому обычное сообщение о прогрессе другого агента может остановить автономное продолжение.

Дополнительно ACP Kimi 2.4.1 не передавал все события автономных turn, а ожидающий промпт мог завершиться по событию предыдущего turn. Нормализация replay также переводила persisted active goal в paused.

Форк согласует native steer, использует prompt/turn identifiers для доставки автономных событий и включает отдельный opt-in флаг сохранения persisted active goal. Отказы, Stop и явно paused/blocked проверяются отдельно. Изменение настроек выполнения остаётся на штатной процедуре пересогласования BB.

Аудит возможностей ACP по handshake недостаточен: одинаковый список capabilities не гарантирует правильный жизненный цикл автономных turn. Предыдущий вывод «изменений плагина не требуется» в аудите 2.4.1 не покрывал эти сценарии.

Воспроизведение, установка, версии, ограничения и критерии удаления каждого патча: [FORK.md](../../FORK.md). При новом SDK генератор проверяет hash и отказывается применять неизвестное преобразование. Новая версия апстрима и закрытый issue требуют регрессионной проверки, а не автоматического удаления патча.
