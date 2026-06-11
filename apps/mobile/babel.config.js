module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated 4 moved its babel plugin into react-native-worklets.
      // This MUST stay last in the plugins list.
      'react-native-worklets/plugin',
    ],
  };
};
