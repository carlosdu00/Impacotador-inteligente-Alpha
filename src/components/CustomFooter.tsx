import { View, StyleSheet, Text } from "react-native"

export default function CustomFooter() {
    return (
        <View style={ styles.container }>
            <Text style={ styles.text }>Developed by Raisson Souza</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor: "#171a21",
        height: 50,
    },
    text: {
        color: "white",
    },
})