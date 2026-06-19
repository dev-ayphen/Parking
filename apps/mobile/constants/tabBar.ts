import { Platform } from 'react-native';

// Floating tab-bar geometry for the (my-spaces) module. Anything that needs to
// clear the bar (e.g. the global SessionBar) imports these instead of using
// magic numbers. Mirrors the styles in app/(my-spaces)/_layout.tsx:
//   tabBarBackground.height = 64
//   tabBarContainer.paddingBottom = iOS 32 / Android 20
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_PADDING = Platform.OS === 'ios' ? 32 : 20;
export const TAB_BAR_TOTAL = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_PADDING;
