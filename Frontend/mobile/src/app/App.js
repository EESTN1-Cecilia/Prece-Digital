import React from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { modules } from "../../../../Shared/src/domain.mjs";

export default function App() {
  return React.createElement(
    SafeAreaView,
    {
      style: styles.safeArea
    },
    React.createElement(StatusBar, {
      barStyle: "dark-content"
    }),
    React.createElement(
      ScrollView,
      {
        contentContainerStyle: styles.container
      },
      React.createElement(Text, { style: styles.brand }, "Prece Digital"),
      React.createElement(Text, { style: styles.title }, "Asistencia movil"),
      modules.map((module) =>
        React.createElement(
          View,
          {
            key: module.id,
            style: styles.card
          },
          React.createElement(Text, { style: styles.cardTitle }, module.name),
          React.createElement(Text, { style: styles.cardBody }, module.description)
        )
      )
    )
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f7f9"
  },
  container: {
    gap: 12,
    padding: 20
  },
  brand: {
    color: "#c96f3b",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: "#17202a",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e0e8",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  cardTitle: {
    color: "#17202a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4
  },
  cardBody: {
    color: "#5d6b7a",
    fontSize: 14,
    lineHeight: 20
  }
});
