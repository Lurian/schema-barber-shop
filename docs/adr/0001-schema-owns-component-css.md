# Schema owns every visual class

Components in this project ship no CSS and no Tailwind class strings. A component renders behavior, structure, and `data-ui-*` hooks, then forwards `className`. Every visual class comes from the page document, such as `pages/client.json`.

The compiler resolves that schema through swatches. A `styles` map is keyed by component type. Each type has a `base` swatch, always applied, and named swatches of Tailwind utilities. A `$` token pulls in another swatch of the same type. An element's `style` array, literals or `$` tokens, is applied after `base`. The compiler flattens the result into one `className` and does not leave `style` in the generated JSX.

`data-ui-{component}` marks the root. `data-ui-{component}-{part}` marks a visually distinct part. Base UI state attributes (`data-open`, `data-invalid`, `data-disabled`) stay on the element. A swatch reaches a part or a state with Tailwind's attribute variants (`data-open:bg-neutral-100`), not with a class written inside the component. A look the schema cannot reach through one of these hooks does not belong in the component.

Keeping the classes that were in the components, and letting `style` only add more, was the other option. That leaves the real look in TypeScript, where a page author cannot see or change it, and makes the schema a partial override. Two pages then cannot restyle the same component without editing its source.

One consequence: a part rendered through a portal, such as a drawer's popup, is outside its trigger's subtree, so no swatch on the trigger can reach it. Such parts are page elements of their own (`DrawerPopup`, `DrawerBackdrop`) rather than markup inside one component. The generated app also scans only its own `page.tsx` for Tailwind classes, so a class written inside a component produces no CSS.
