import { StyleSheet, View } from "react-native"
import CustomFooter from "./CustomFooter"
import CustomHeader from "./CustomHeader"
import React from "react"

type ScreenBaseProps = {
    children: JSX.Element | JSX.Element[]
    marginTop?: number
}

export default function ScreenBase({ children, marginTop = 40 }: ScreenBaseProps) {
    return (
        <View style={ styles.container }>
            <CustomHeader marginTop={ marginTop } />
            { children }
            <CustomFooter />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
});